// OWNER: Alisa (voice). Framework-free voice adapter between the ElevenLabs agent and window.launchpal.
//
// The voice follows the ring:
//  - A `launchpal:step` event (guided mode) is spoken the moment it fires. The frontend dispatches it right
//    after the ring is drawn, so the ring and the sentence start together.
//  - "Where do I click?" by voice runs the `inspect_screen` client tool. It resolves after the ring is drawn,
//    and the agent then speaks the result.
//  - When the ring leaves the screen (the customer clicked, or guiding stopped) while its instruction is
//    still being spoken, the audio is silenced, so the voice never describes a ring that is gone. If the
//    same step comes back, it is spoken again in full.
//  - On connect, the instruction currently on screen is spoken, so a session that starts mid-setup catches up.
//
// The ElevenLabs agent says a step when it receives a user message that starts with SCREEN_TAG
// (see voice/system-prompt.md, which must stay in step with stepMessage and toolResult below).
import {
  QUESTION_ASK,
  STEP_EVENT,
  type InspectResponse,
  type LaunchpalApi,
  type LaunchpalStatus,
} from "../launchpal/types";

export type VoiceMode = "listening" | "speaking";

export interface VoiceState {
  phase: "connecting" | "live" | "error";
  mode: VoiceMode;
  micMuted: boolean;
  /** Customer-facing message when phase is "error". */
  error?: string;
}

export const INITIAL_VOICE_STATE: VoiceState = { phase: "connecting", mode: "listening", micMuted: false };

/** The part of an ElevenLabs conversation this adapter uses (@elevenlabs/client's VoiceConversation fits). */
export interface VoiceConversationLike {
  endSession(): Promise<void>;
  sendUserMessage(text: string): void;
  sendUserActivity(): void;
  setVolume(options: { volume: number }): void;
  setMicMuted(muted: boolean): void;
}

/** Callbacks and client tools the adapter hands to the ElevenLabs session. */
export interface VoiceHandlers {
  clientTools: { inspect_screen: () => Promise<string> };
  onModeChange(prop: { mode: VoiceMode }): void;
  onMessage(prop: { message: string; role: "user" | "agent" }): void;
  onDisconnect(details: { reason: "error" | "agent" | "user" }): void;
  onError(message: string): void;
}

export interface VoiceAgentDeps {
  /** Opens the ElevenLabs session. Rejects with an Error whose message is safe to show the customer. */
  connect(handlers: VoiceHandlers): Promise<VoiceConversationLike>;
  getLaunchpal(): LaunchpalApi | undefined;
  getStatus(): LaunchpalStatus;
  subscribeStatus(cb: () => void): () => void;
  onState(state: VoiceState): void;
  /** Where `launchpal:step` is dispatched. Defaults to window. */
  events?: Pick<EventTarget, "addEventListener" | "removeEventListener">;
}

export interface VoiceAgent {
  start(): Promise<void>;
  stop(): Promise<void>;
  setMicMuted(muted: boolean): void;
}

type Spoken = InspectResponse["status"];

export const SCREEN_TAG = "[screen]";
export const START_FAILED = "Couldn't start voice — try again.";
const INSPECT_FAILED = "Couldn't check your screen — try again.";

/** Silence resets the agent's "take turn after silence" timer, so it never asks "are you still there?". */
const KEEPALIVE_MS = 20_000;
/** A step message that hasn't produced speech after this long is no longer "about to be spoken". */
const STEP_REPLY_TTL_MS = 8_000;
/** Longest the output stays silenced for a stale instruction. */
const STALE_MUTE_MAX_MS = 5_000;

/** What the agent receives for a step. The system prompt tells it to say the instruction word for word. */
export function stepMessage(status: Spoken, instruction: string): string {
  return `${SCREEN_TAG} ${status}: ${instruction.trim()}`;
}

/** What `inspect_screen` returns to the agent. The system prompt tells it to say `say` word for word. */
export function toolResult(status: Spoken | "error", say: string): string {
  return JSON.stringify({ status, say: say.trim() });
}

function isSpoken(kind: string): kind is Spoken {
  return kind === "point" || kind === "unclear" || kind === "done";
}

function keyOf(status: string, instruction: string) {
  return `${status}|${instruction.trim().toLowerCase()}`;
}

export function createVoiceAgent(deps: VoiceAgentDeps): VoiceAgent {
  const events = deps.events ?? window;

  let state = INITIAL_VOICE_STATE;
  let conv: VoiceConversationLike | null = null;
  let started = false;
  let stopped = false;
  let unsubscribe: (() => void) | null = null;

  /** The last instruction handed to the agent. `cut` = it was silenced before the customer heard all of it. */
  let spoken: { status: Spoken; key: string; cut: boolean } | null = null;
  /** An instruction the agent is about to say, or is saying. */
  let stepSpeech: { sentAt: number; started: boolean } | null = null;
  /** Output is silenced because the instruction being spoken no longer matches the screen. */
  let staleMute: { sawSpeaking: boolean; timer: ReturnType<typeof setTimeout> } | null = null;
  let toolCalls = 0;
  let keepAlive: ReturnType<typeof setTimeout> | null = null;
  let syncTimer: ReturnType<typeof setTimeout> | null = null;

  function setState(patch: Partial<VoiceState>) {
    if (stopped) return;
    state = { ...state, ...patch };
    deps.onState(state);
  }

  /** Restart the keep-alive countdown after any activity. */
  function touch() {
    if (keepAlive) clearTimeout(keepAlive);
    keepAlive = null;
    if (!conv) return;
    keepAlive = setTimeout(() => {
      try {
        conv?.sendUserActivity();
      } catch {
        /* the session is closing */
      }
      touch();
    }, KEEPALIVE_MS);
  }

  function unmute() {
    if (!staleMute) return;
    clearTimeout(staleMute.timer);
    staleMute = null;
    try {
      conv?.setVolume({ volume: 1 });
    } catch {
      /* the session is closing */
    }
  }

  /** The ring left the screen: silence an instruction that is still being (or about to be) spoken. */
  function ringCleared() {
    if (!conv || staleMute || !stepSpeech) return;
    const pending = !stepSpeech.started && Date.now() - stepSpeech.sentAt <= STEP_REPLY_TTL_MS;
    const speaking = stepSpeech.started;
    stepSpeech = null;
    if (!pending && !speaking) return;
    if (spoken) spoken.cut = true;
    staleMute = { sawSpeaking: state.mode === "speaking", timer: setTimeout(unmute, STALE_MUTE_MAX_MS) };
    try {
      conv.setVolume({ volume: 0 });
    } catch {
      /* the session is closing */
    }
  }

  /** Hand an instruction to the agent to say now. A new message also interrupts whatever it was saying. */
  function say(status: Spoken, instruction: string) {
    if (!conv) return; // not connected yet: start() speaks whatever is on screen once it is
    spoken = { status, key: keyOf(status, instruction), cut: false };
    unmute();
    stepSpeech = { sentAt: Date.now(), started: false };
    try {
      conv.sendUserMessage(stepMessage(status, instruction));
    } catch {
      stepSpeech = null;
    }
    touch();
  }

  /**
   * Speak the instruction on screen if the customer hasn't heard it: on connect, after a silenced
   * instruction returns, or when an inspection ran outside guided mode and the voice tool (the panel's
   * "Ask: Where do I click?" button).
   */
  function syncFromStatus() {
    syncTimer = null;
    if (!conv || toolCalls > 0) return;
    const s = deps.getStatus();
    if (!isSpoken(s.kind) || !s.instruction) return;
    if (spoken && !spoken.cut) {
      if (spoken.key === keyOf(s.kind, s.instruction)) return;
      if (s.kind === "unclear" && spoken.status === "unclear") return; // one "unclear" at a time, like the step events
    }
    say(s.kind, s.instruction);
  }

  function onStatus() {
    const s = deps.getStatus();
    if (s.kind === "guiding" || s.kind === "ready") {
      ringCleared(); // the screen changed under the ring, or guiding stopped
    } else if (isSpoken(s.kind) && syncTimer === null) {
      // Deferred, so a step event or tool result for this same inspection is handled first.
      syncTimer = setTimeout(syncFromStatus, 0);
    }
  }

  function onStep(e: Event) {
    const res = (e as CustomEvent<InspectResponse | undefined>).detail;
    if (!res || !isSpoken(res.status) || typeof res.instruction !== "string" || !res.instruction.trim()) return;
    if (toolCalls > 0) return; // the agent is waiting on inspect_screen, which reports what is on screen when it returns
    say(res.status, res.instruction);
  }

  /** Client tool: the customer asked what to do. Resolves after the ring is drawn. Never throws. */
  async function inspectScreenTool(): Promise<string> {
    toolCalls++;
    unmute();
    touch();
    try {
      const lp = deps.getLaunchpal();
      if (!lp) return toolResult("error", INSPECT_FAILED);
      const res = await lp.inspectScreen(QUESTION_ASK);
      // Report what is on screen now: guided mode may have replaced this answer with a newer frame.
      const s = deps.getStatus();
      const shown = isSpoken(s.kind) && s.instruction ? { status: s.kind, instruction: s.instruction } : res;
      spoken = { status: shown.status, key: keyOf(shown.status, shown.instruction), cut: false };
      stepSpeech = { sentAt: Date.now(), started: false };
      return toolResult(shown.status, shown.instruction);
    } catch (e) {
      // window.launchpal rejects with a message that is safe to speak.
      return toolResult("error", e instanceof Error && e.message ? e.message : INSPECT_FAILED);
    } finally {
      toolCalls--;
      touch();
    }
  }

  function onModeChange({ mode }: { mode: VoiceMode }) {
    setState({ mode });
    if (mode === "speaking") {
      if (stepSpeech) stepSpeech.started = true;
      if (staleMute) staleMute.sawSpeaking = true;
      return;
    }
    if (stepSpeech?.started) stepSpeech = null; // the instruction was spoken in full
    if (staleMute?.sawSpeaking) unmute(); // the stale instruction is over
    touch();
  }

  function onMessage({ message, role }: { message: string; role: "user" | "agent" }) {
    if (role !== "user" || message.startsWith(SCREEN_TAG)) return;
    // The customer spoke: what the agent says next is an answer to them, so it must be heard.
    stepSpeech = null;
    unmute();
    touch();
  }

  function release() {
    events.removeEventListener(STEP_EVENT, onStep);
    unsubscribe?.();
    unsubscribe = null;
    if (keepAlive) clearTimeout(keepAlive);
    if (syncTimer) clearTimeout(syncTimer);
    if (staleMute) clearTimeout(staleMute.timer);
    keepAlive = syncTimer = null;
    staleMute = null;
    stepSpeech = null;
    conv = null;
  }

  function onDisconnect({ reason }: { reason: "error" | "agent" | "user" }) {
    if (stopped || state.phase === "error") return;
    const wasLive = conv !== null;
    release();
    setState({
      phase: "error",
      mode: "listening",
      error: !wasLive ? START_FAILED : reason === "error" ? "Voice disconnected." : "The voice session ended.",
    });
  }

  async function start() {
    if (started) return;
    started = true;
    events.addEventListener(STEP_EVENT, onStep);
    unsubscribe = deps.subscribeStatus(onStatus);
    try {
      const session = await deps.connect({
        clientTools: { inspect_screen: inspectScreenTool },
        onModeChange,
        onMessage,
        onDisconnect,
        onError: (message) => console.warn("[voice]", message),
      });
      if (stopped || state.phase === "error") {
        void session.endSession().catch(() => {});
        return;
      }
      conv = session;
      setState({ phase: "live" });
      touch();
      syncFromStatus();
    } catch (e) {
      if (stopped || state.phase === "error") return;
      release();
      setState({ phase: "error", error: e instanceof Error && e.message ? e.message : START_FAILED });
    }
  }

  async function stop() {
    if (stopped) return;
    stopped = true;
    const session = conv;
    release();
    if (session) await session.endSession().catch(() => {});
  }

  function setMicMuted(muted: boolean) {
    if (!conv) return;
    try {
      conv.setMicMuted(muted);
    } catch {
      return;
    }
    setState({ micMuted: muted });
  }

  return { start, stop, setMicMuted };
}
