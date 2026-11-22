// OWNER: Alisa (voice). Checks that the voice stays in step with the ring, using a fake ElevenLabs session.
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { InspectResponse, LaunchpalApi, LaunchpalStatus } from "../launchpal/types";
import {
  createVoiceAgent,
  stepMessage,
  toolResult,
  type VoiceConversationLike,
  type VoiceHandlers,
  type VoiceState,
} from "./voiceAgent";

const CONNECT: InspectResponse = {
  frameId: "f1",
  status: "point",
  instruction: "Click Connect workspace.",
  target: { x: 0.55, y: 0.27, width: 0.13, height: 0.05 },
};
const ALLOW: InspectResponse = {
  frameId: "f2",
  status: "point",
  instruction: "Click Allow access.",
  target: { x: 0.67, y: 0.56, width: 0.1, height: 0.05 },
};
const DONE: InspectResponse = { frameId: "f3", status: "done", instruction: "Your workspace is connected.", target: null };

function harness() {
  let status: LaunchpalStatus = { kind: "ready", text: "Ready", guided: false };
  const listeners = new Set<() => void>();
  const events = new EventTarget();
  const sent: string[] = [];
  const volumes: number[] = [];
  const states: VoiceState[] = [];
  let handlers!: VoiceHandlers;
  let open!: () => void;
  let fail!: (e: Error) => void;

  const session = {
    endSession: vi.fn(async () => {}),
    sendUserMessage: (text: string) => void sent.push(text),
    sendUserActivity: vi.fn(),
    setVolume: ({ volume }: { volume: number }) => void volumes.push(volume),
    setMicMuted: vi.fn(),
  } satisfies VoiceConversationLike;

  /** What the frontend does when an inspection finishes: draw the ring, then update the status strip. */
  function show(res: InspectResponse) {
    status = { ...status, kind: res.status, text: "", instruction: res.instruction };
    listeners.forEach((l) => l());
  }
  function setKind(kind: LaunchpalStatus["kind"]) {
    status = { ...status, kind };
    listeners.forEach((l) => l());
  }

  const inspectScreen = vi.fn(async (_question: string): Promise<InspectResponse> => {
    show(ALLOW);
    return ALLOW;
  });
  const launchpal: LaunchpalApi = {
    mode: "desktop",
    inspectScreen,
    startGuided: () => {},
    stopGuided: () => {},
    guided: true,
  };

  const agent = createVoiceAgent({
    connect: (h) => {
      handlers = h;
      return new Promise<VoiceConversationLike>((resolve, reject) => {
        open = () => resolve(session);
        fail = reject;
      });
    },
    getLaunchpal: () => launchpal,
    getStatus: () => status,
    subscribeStatus: (cb) => {
      listeners.add(cb);
      return () => listeners.delete(cb);
    },
    onState: (s) => void states.push(s),
    events,
  });

  return {
    agent,
    session,
    sent,
    volumes,
    states,
    inspectScreen,
    show,
    setKind,
    /** Guided mode found a step: ring drawn + status updated, then the step event (same task). */
    step(res: InspectResponse) {
      show(res);
      events.dispatchEvent(new CustomEvent("launchpal:step", { detail: res }));
    },
    async connect() {
      const started = agent.start();
      open();
      await started;
    },
    startOnly: () => agent.start(),
    open: () => open(),
    fail: (e: Error) => fail(e),
    handlers: () => handlers,
    /** The agent says its current reply from start to finish. */
    speakFully() {
      handlers.onModeChange({ mode: "speaking" });
      handlers.onModeChange({ mode: "listening" });
    },
  };
}

describe("voice agent", () => {
  beforeEach(() => void vi.useFakeTimers());
  afterEach(() => void vi.useRealTimers());

  it("speaks each guided step once, when its ring appears", async () => {
    const h = harness();
    await h.connect();
    expect(h.sent).toEqual([]);

    h.step(CONNECT);
    await vi.advanceTimersByTimeAsync(0);
    expect(h.sent).toEqual([stepMessage("point", CONNECT.instruction)]);
    h.speakFully();

    h.setKind("guiding"); // the customer clicked: ring cleared
    h.setKind("looking");
    h.step(ALLOW);
    h.speakFully();
    h.setKind("guiding");
    h.setKind("looking");
    h.step(DONE);
    h.show(DONE); // guided mode stops itself and sets "done" again
    await vi.advanceTimersByTimeAsync(0);

    expect(h.sent).toEqual([
      "[screen] point: Click Connect workspace.",
      "[screen] point: Click Allow access.",
      "[screen] done: Your workspace is connected.",
    ]);
    expect(h.volumes).toEqual([]); // never silenced: every instruction finished before its ring left
  });

  it("speaks the step that is on screen once the session connects", async () => {
    const h = harness();
    const started = h.startOnly();
    h.step(CONNECT); // found while the voice session was still connecting
    await vi.advanceTimersByTimeAsync(0);
    expect(h.sent).toEqual([]);

    h.open();
    await started;
    expect(h.sent).toEqual([stepMessage("point", CONNECT.instruction)]);
    expect(h.states.at(-1)?.phase).toBe("live");
  });

  it("says nothing on connect when the ring from an earlier step is already gone", async () => {
    const h = harness();
    const started = h.startOnly();
    h.step(CONNECT);
    h.setKind("guiding"); // screen changed before the session connected
    h.open();
    await started;
    expect(h.sent).toEqual([]);
  });

  it("silences an instruction whose ring left the screen, then restores the volume", async () => {
    const h = harness();
    await h.connect();
    h.step(CONNECT);
    h.handlers().onModeChange({ mode: "speaking" });

    h.setKind("guiding"); // the customer clicked mid-sentence
    expect(h.volumes).toEqual([0]);

    h.handlers().onModeChange({ mode: "listening" }); // the stale sentence is over
    expect(h.volumes).toEqual([0, 1]);

    h.setKind("looking");
    h.step(ALLOW);
    expect(h.sent.at(-1)).toBe(stepMessage("point", ALLOW.instruction));
    expect(h.volumes).toEqual([0, 1]);
  });

  it("silences an instruction the agent has not started saying yet", async () => {
    const h = harness();
    await h.connect();
    h.step(CONNECT);
    h.setKind("guiding"); // clicked before the agent began to speak
    expect(h.volumes).toEqual([0]);

    h.handlers().onModeChange({ mode: "speaking" });
    expect(h.volumes).toEqual([0]);
    h.handlers().onModeChange({ mode: "listening" });
    expect(h.volumes).toEqual([0, 1]);
  });

  it("never stays silenced: the volume comes back after a few seconds", async () => {
    const h = harness();
    await h.connect();
    h.step(CONNECT);
    h.setKind("guiding");
    expect(h.volumes).toEqual([0]);
    await vi.advanceTimersByTimeAsync(5000);
    expect(h.volumes).toEqual([0, 1]);
  });

  it("repeats a silenced instruction when the same step comes back", async () => {
    const h = harness();
    await h.connect();
    h.step(CONNECT);
    h.handlers().onModeChange({ mode: "speaking" });
    h.setKind("guiding"); // e.g. an animation, not a click
    h.handlers().onModeChange({ mode: "listening" });

    h.setKind("looking");
    h.show(CONNECT); // same step again: the frontend redraws the ring without a new step event
    await vi.advanceTimersByTimeAsync(0);
    expect(h.sent).toEqual([stepMessage("point", CONNECT.instruction), stepMessage("point", CONNECT.instruction)]);
  });

  it("does not repeat a fully spoken instruction when the same step is inspected again", async () => {
    const h = harness();
    await h.connect();
    h.step(CONNECT);
    h.speakFully();
    h.setKind("guiding");
    h.setKind("looking");
    h.show(CONNECT);
    await vi.advanceTimersByTimeAsync(0);
    expect(h.sent).toHaveLength(1);
    expect(h.volumes).toEqual([]);
  });

  it("does not cut an answer to the customer when the screen changes", async () => {
    const h = harness();
    await h.connect();
    h.step(CONNECT);
    h.speakFully();
    h.handlers().onMessage({ message: "Why do I need to allow access?", role: "user" });
    h.handlers().onModeChange({ mode: "speaking" }); // answering the question
    h.setKind("guiding");
    expect(h.volumes).toEqual([]);
  });

  it("answers “Where do I click?” through inspect_screen without announcing it twice", async () => {
    const h = harness();
    await h.connect();
    h.step(CONNECT);
    h.speakFully();

    const result = await h.handlers().clientTools.inspect_screen();
    await vi.advanceTimersByTimeAsync(0);

    expect(h.inspectScreen).toHaveBeenCalledWith("Where do I click?");
    expect(result).toBe(toolResult("point", ALLOW.instruction));
    expect(JSON.parse(result)).toEqual({ status: "point", say: "Click Allow access." });
    expect(h.sent).toHaveLength(1); // the agent speaks the tool result itself
  });

  it("returns a speakable error from inspect_screen instead of throwing", async () => {
    const h = harness();
    await h.connect();
    h.inspectScreen.mockRejectedValueOnce(new Error("Couldn't check your screen — try again."));
    const result = await h.handlers().clientTools.inspect_screen();
    expect(JSON.parse(result)).toEqual({ status: "error", say: "Couldn't check your screen — try again." });
  });

  it("speaks the answer when the customer uses the panel's Ask button", async () => {
    const h = harness();
    await h.connect();
    h.setKind("looking");
    h.show(ALLOW); // an inspection outside guided mode and the voice tool: no step event
    await vi.advanceTimersByTimeAsync(0);
    expect(h.sent).toEqual([stepMessage("point", ALLOW.instruction)]);
  });

  it("asks for a clearer view only once in a row", async () => {
    const h = harness();
    await h.connect();
    const unclear = (instruction: string): InspectResponse => ({ frameId: "u", status: "unclear", instruction, target: null });
    h.step(unclear("Please bring the Acme Sync setup window to the front."));
    h.speakFully();
    h.setKind("looking");
    h.show(unclear("Open the Acme Sync setup window.")); // reworded by the model; no step event
    await vi.advanceTimersByTimeAsync(0);
    expect(h.sent).toHaveLength(1);
  });

  it("keeps the session alive during silence", async () => {
    const h = harness();
    await h.connect();
    await vi.advanceTimersByTimeAsync(45_000);
    expect(h.session.sendUserActivity).toHaveBeenCalledTimes(2);
  });

  it("reports a start failure with the customer-facing message", async () => {
    const h = harness();
    const started = h.startOnly();
    h.fail(new Error("Voice isn't set up yet."));
    await started;
    expect(h.states.at(-1)).toMatchObject({ phase: "error", error: "Voice isn't set up yet." });
  });

  it("reports a dropped session and stops speaking steps", async () => {
    const h = harness();
    await h.connect();
    h.handlers().onDisconnect({ reason: "error" });
    expect(h.states.at(-1)).toMatchObject({ phase: "error", error: "Voice disconnected." });
    h.step(CONNECT);
    await vi.advanceTimersByTimeAsync(0);
    expect(h.sent).toEqual([]);
  });

  it("ends the session when stopped, including while still connecting", async () => {
    const live = harness();
    await live.connect();
    await live.agent.stop();
    expect(live.session.endSession).toHaveBeenCalledTimes(1);
    live.step(CONNECT);
    expect(live.sent).toEqual([]);

    const connecting = harness();
    const started = connecting.startOnly();
    await connecting.agent.stop();
    connecting.open();
    await started;
    expect(connecting.session.endSession).toHaveBeenCalledTimes(1);
    expect(connecting.states).toEqual([]);
  });

  it("mutes and unmutes the microphone", async () => {
    const h = harness();
    await h.connect();
    h.agent.setMicMuted(true);
    expect(h.session.setMicMuted).toHaveBeenCalledWith(true);
    expect(h.states.at(-1)?.micMuted).toBe(true);
  });
});
