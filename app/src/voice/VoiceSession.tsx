// OWNER: Alisa (voice). fe created this stub as the mount point; replace its contents freely.
//
// Mounted by ControlPanelPage when the customer presses "Talk" (guided mode is already started by then).
// Available to you:
//   - getElevenLabsToken()  from "wasp/client/operations" → { token, agentId } (server-side ElevenLabs token)
//   - window.launchpal.inspectScreen(question)  → InspectResponse; rejects with a speakable Error.message
//       question: "Where do I click?" (customer asks) | "What is the next step?" (guided)
//   - window "launchpal:step" CustomEvent (detail = InspectResponse) → speak detail.instruction unprompted
//   - types in ../launchpal/types (InspectResponse, QUESTION_ASK, STEP_EVENT)
// Call onEnd() when the conversation ends so the panel can unmount this component.

export interface VoiceSessionProps {
  onEnd: () => void;
}

export function VoiceSession({ onEnd }: VoiceSessionProps) {
  return (
    <div className="lp-voice-session">
      <p className="lp-muted">Voice agent not connected yet. Guided setup is running.</p>
      <button className="lp-btn lp-btn-small" onClick={onEnd}>
        End voice
      </button>
    </div>
  );
}
