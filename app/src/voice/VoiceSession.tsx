// OWNER: Alisa (voice). Mounted by ControlPanelPage when the customer presses "Talk" (guided mode is
// already started by then). Runs the ElevenLabs agent for as long as it is mounted:
//   - the customer can ask questions out loud; "Where do I click?" runs the inspect_screen client tool
//   - every `launchpal:step` event is spoken without being asked, in step with the ring
// The logic lives in ./voiceAgent (framework-free); ./elevenlabsConnect opens the ElevenLabs session.
import { useEffect, useRef, useState } from "react";
import { getLaunchpal, getStatus, subscribeStatus } from "../launchpal/setup";
import { connectElevenLabs } from "./elevenlabsConnect";
import { createVoiceAgent, INITIAL_VOICE_STATE, type VoiceAgent, type VoiceState } from "./voiceAgent";
import "./voice.css";

export interface VoiceSessionProps {
  onEnd: () => void;
}

function describe(state: VoiceState): { label: string; hint: string } {
  if (state.phase === "connecting") return { label: "Connecting voice…", hint: "Allow the microphone if you're asked." };
  if (state.phase === "error") return { label: "Voice is off", hint: state.error ?? "" };
  if (state.mode === "speaking") return { label: "Speaking…", hint: "You can interrupt at any time." };
  if (state.micMuted) return { label: "Microphone muted", hint: "LaunchPal still reads each step aloud." };
  return { label: "Listening", hint: "Ask a question any time, like “Where do I click?”" };
}

export function VoiceSession({ onEnd }: VoiceSessionProps) {
  const [attempt, setAttempt] = useState(0);
  const [state, setState] = useState<VoiceState>(INITIAL_VOICE_STATE);
  const agentRef = useRef<VoiceAgent | null>(null);

  useEffect(() => {
    setState(INITIAL_VOICE_STATE);
    const agent = createVoiceAgent({
      connect: connectElevenLabs,
      getLaunchpal,
      getStatus,
      subscribeStatus,
      onState: setState,
    });
    agentRef.current = agent;
    void agent.start();
    return () => {
      agentRef.current = null;
      void agent.stop();
    };
  }, [attempt]);

  const { label, hint } = describe(state);
  const tone = state.phase === "live" ? state.mode : state.phase;

  return (
    <div className="lp-voice-session">
      <p className={`lp-voice-state lp-voice-${tone}`} role="status" aria-live="polite">
        <span className="lp-voice-dot" aria-hidden />
        {label}
      </p>
      {hint && <p className="lp-muted">{hint}</p>}
      <div className="lp-voice-actions">
        {state.phase === "live" && (
          <button
            className="lp-btn lp-btn-small"
            aria-pressed={state.micMuted}
            onClick={() => agentRef.current?.setMicMuted(!state.micMuted)}
          >
            {state.micMuted ? "Unmute microphone" : "Mute microphone"}
          </button>
        )}
        {state.phase === "error" && (
          <button className="lp-btn lp-btn-small" onClick={() => setAttempt((n) => n + 1)}>
            Try again
          </button>
        )}
        <button className="lp-btn lp-btn-small" onClick={onEnd}>
          End voice
        </button>
      </div>
    </div>
  );
}
