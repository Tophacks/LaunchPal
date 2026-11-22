// window.launchpal: inspection, guided mode and step events. Framework-free; the React panel subscribes
// to status via onStatus. Both desktop (Electron) and browser modes plug in through a CaptureAdapter.
import { hasChanged, isNewStep, type Thumb } from "./changeDetect";
import { GENERIC_ERROR, LaunchpalError } from "./inspectClient";
import {
  QUESTION_GUIDED,
  STEP_EVENT,
  type InspectRequest,
  type InspectResponse,
  type LaunchpalApi,
  type LaunchpalMode,
  type LaunchpalStatus,
  type Target,
} from "./types";

export interface CaptureAdapter {
  mode: LaunchpalMode;
  /** Full screen frame. Throws LaunchpalError with a user-facing message on failure. */
  captureFrame(): Promise<{ imageDataUrl: string; blank: boolean }>;
  /** Cheap grayscale frame for change detection, plus a region to ignore (the control window). */
  captureThumb(): Promise<{ thumb: Thumb; exclude: Target | null }>;
  showRing(target: Target, label: string): Promise<void>;
  clearRing(): Promise<void>;
}

export interface LaunchpalOptions {
  adapter: CaptureAdapter;
  inspect: (req: InspectRequest) => Promise<InspectResponse>;
  onStatus?: (s: LaunchpalStatus) => void;
  /** Published guide slug sent as guideId (omitted = default guide). */
  guideId?: string;
}

const POLL_MS = 2000;
const SETTLE_POLL_MS = 500;
const STABLE_MS = 1000;
const MIN_GAP_MS = 3000;

const TEXT = {
  ready: "Ready",
  guiding: "Guiding…",
  looking: "Looking…",
  point: "Next step found",
  unclear: "Need a clearer view",
  done: "Setup complete ✅",
} as const;

let frameSeq = 0;
function newFrameId() {
  const rand = Math.random().toString(36).slice(2, 8);
  return `frame-${Date.now()}-${++frameSeq}-${rand}`;
}

export function createLaunchpal(opts: LaunchpalOptions): LaunchpalApi & {
  getStatus(): LaunchpalStatus;
  stopWithMessage(text: string): void;
} {
  const { adapter, inspect } = opts;

  let status: LaunchpalStatus = { kind: "ready", text: TEXT.ready, guided: false };
  let latestFrameId: string | null = null;

  // Guided-mode state
  let guided = false;
  let timer: ReturnType<typeof setTimeout> | null = null;
  let baseline: Thumb | null = null;
  let changedAt: number | null = null; // when we last saw the screen change (pending settle)
  let inFlight = false;
  let lastRequestAt = 0;
  let pendingInspect = false;
  let lastAnnounced: InspectResponse | null = null;
  let unclearAnnounced = false;
  let errorRetries = 0;

  function setStatus(patch: Partial<LaunchpalStatus>) {
    status = { ...status, ...patch, guided };
    opts.onStatus?.(status);
  }

  async function inspectScreen(question: string): Promise<InspectResponse> {
    // 1. clear the ring
    await adapter.clearRing().catch(() => {});
    setStatus({ kind: "looking", text: TEXT.looking });
    // 3. unique frameId; it becomes the latest immediately so older in-flight responses are dropped
    const frameId = newFrameId();
    latestFrameId = frameId;
    try {
      // 2. capture the full primary screen
      const frame = await adapter.captureFrame();
      if (frame.blank) {
        throw new LaunchpalError(
          adapter.mode === "desktop"
            ? "Your screen came back blank. Grant Screen Recording in System Settings, then restart LaunchPal."
            : "Your shared screen came back blank. Share your entire screen and try again.",
          "blank",
        );
      }
      // 4. call the proxy
      const req: InspectRequest = { frameId, imageDataUrl: frame.imageDataUrl, question };
      if (opts.guideId) req.guideId = opts.guideId;
      const res = await inspect(req);
      // 5. drop it if a newer capture started (or guiding stopped) meanwhile
      if (latestFrameId !== frameId || res.frameId !== frameId) return res;
      // 6. draw or clear the ring
      if (res.status === "point" && res.target) {
        await adapter.showRing(res.target, res.instruction);
      } else {
        await adapter.clearRing();
      }
      // 7. status strip
      setStatus({ kind: res.status, text: TEXT[res.status], instruction: res.instruction });
      // 8. return
      return res;
    } catch (e) {
      const message = e instanceof Error && e.message ? e.message : GENERIC_ERROR;
      if (latestFrameId === frameId) setStatus({ kind: "error", text: message, instruction: undefined });
      throw e instanceof LaunchpalError ? e : new LaunchpalError(GENERIC_ERROR);
    }
  }

  // ---------- guided mode ----------

  function schedule(ms: number) {
    if (timer) clearTimeout(timer);
    if (guided) timer = setTimeout(tick, ms);
  }

  async function refreshBaseline() {
    try {
      baseline = (await adapter.captureThumb()).thumb;
    } catch {
      baseline = null;
    }
    changedAt = null;
  }

  function announce(res: InspectResponse) {
    if (res.status === "unclear") {
      if (unclearAnnounced) return;
      unclearAnnounced = true;
    } else {
      unclearAnnounced = false;
      if (!isNewStep(lastAnnounced, res)) return;
    }
    lastAnnounced = res;
    window.dispatchEvent(new CustomEvent(STEP_EVENT, { detail: res }));
  }

  async function guidedInspect() {
    if (!guided) return;
    const wait = lastRequestAt + MIN_GAP_MS - Date.now();
    if (inFlight || wait > 0) {
      pendingInspect = true;
      schedule(Math.max(wait, SETTLE_POLL_MS));
      return;
    }
    pendingInspect = false;
    inFlight = true;
    lastRequestAt = Date.now();
    try {
      const res = await inspectScreen(QUESTION_GUIDED);
      if (!guided || res.frameId !== latestFrameId) return;
      announce(res);
      if (res.status === "done") {
        stopGuided(true);
        return;
      }
      errorRetries = 0;
    } catch {
      // Status strip shows the retry message. Retry a couple of times (3 s apart), then wait for a
      // screen change or the customer asking.
      if (guided && errorRetries < 2) {
        errorRetries++;
        pendingInspect = true;
      }
    } finally {
      inFlight = false;
    }
    if (guided) {
      await refreshBaseline();
      schedule(pendingInspect ? MIN_GAP_MS : POLL_MS);
    }
  }

  async function tick() {
    if (!guided) return;
    if (inFlight) return schedule(SETTLE_POLL_MS);
    let snap: { thumb: Thumb; exclude: Target | null };
    try {
      snap = await adapter.captureThumb();
    } catch {
      return schedule(POLL_MS);
    }
    if (!guided) return;
    const changed = !baseline || hasChanged(baseline, snap.thumb, snap.exclude);
    baseline = snap.thumb;
    const now = Date.now();
    if (changed) {
      if (changedAt === null) {
        // The screen moved under the ring: hide it right away.
        await adapter.clearRing().catch(() => {});
        latestFrameId = null; // a response for the old screen must not redraw the ring
        setStatus({ kind: "guiding", text: TEXT.guiding });
      }
      changedAt = now;
      return schedule(SETTLE_POLL_MS);
    }
    if (changedAt !== null && now - changedAt >= STABLE_MS) {
      changedAt = null;
      return void guidedInspect();
    }
    if (pendingInspect) return void guidedInspect();
    schedule(changedAt !== null ? SETTLE_POLL_MS : POLL_MS);
  }

  function startGuided() {
    if (guided) return;
    guided = true;
    lastAnnounced = null;
    unclearAnnounced = false;
    baseline = null;
    changedAt = null;
    pendingInspect = false;
    lastRequestAt = 0;
    errorRetries = 0;
    setStatus({ kind: "guiding", text: TEXT.guiding, instruction: undefined });
    void guidedInspect();
  }

  function stopGuided(completed = false) {
    const was = guided;
    guided = false;
    if (timer) clearTimeout(timer);
    timer = null;
    if (completed) {
      setStatus({ kind: "done", text: TEXT.done });
      return;
    }
    latestFrameId = null; // drop anything still in flight
    void adapter.clearRing().catch(() => {});
    if (was || status.kind !== "ready") setStatus({ kind: "ready", text: TEXT.ready, instruction: undefined });
  }

  /** Customer asks "Where do I click?" — works during guided mode and resets the change baseline. */
  async function inspectAndRebase(question: string) {
    const res = await inspectScreen(question);
    if (guided && res.frameId === latestFrameId) {
      if (res.status !== "unclear") {
        lastAnnounced = res; // the answer was already given; don't re-announce it as a step
        unclearAnnounced = false;
      }
      if (res.status === "done") stopGuided(true);
      else await refreshBaseline();
    }
    return res;
  }

  return {
    mode: adapter.mode,
    inspectScreen: inspectAndRebase,
    startGuided,
    stopGuided: () => stopGuided(false),
    get guided() {
      return guided;
    },
    getStatus: () => status,
    /** Stop guiding and show a message in the status strip (e.g. screen sharing ended). */
    stopWithMessage(text: string) {
      stopGuided(false);
      setStatus({ kind: "error", text, instruction: undefined });
    },
  };
}
