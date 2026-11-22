// OWNER: Alisa (voice). Opens the ElevenLabs agent session for the voice adapter.
// The API key stays on the Wasp server: the client only receives a short-lived conversation token.
import { Conversation } from "@elevenlabs/client";
import { getElevenLabsToken } from "wasp/client/operations";
import { START_FAILED, type VoiceConversationLike, type VoiceHandlers } from "./voiceAgent";

const NOT_SET_UP = "Voice isn't set up yet.";
const MIC_BLOCKED = "LaunchPal needs your microphone to hear you. Allow microphone access, then try again.";
const NO_MIC = "No microphone found. Connect one, then try again.";

/** Ask for the microphone up front, so a refusal gets a clear message instead of a failed connection. */
async function ensureMicrophone() {
  if (!navigator.mediaDevices?.getUserMedia) throw new Error(NO_MIC);
  try {
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    stream.getTracks().forEach((track) => track.stop());
  } catch (e) {
    const name = e instanceof Error ? e.name : "";
    throw new Error(name === "NotFoundError" || name === "OverconstrainedError" ? NO_MIC : MIC_BLOCKED);
  }
}

function httpStatus(e: unknown): number | undefined {
  const err = e as { statusCode?: number; response?: { status?: number } } | null;
  return err?.statusCode ?? err?.response?.status;
}

/** Rejects with an Error whose message is safe to show the customer. */
export async function connectElevenLabs(handlers: VoiceHandlers): Promise<VoiceConversationLike> {
  await ensureMicrophone();

  let token: string;
  try {
    ({ token } = await getElevenLabsToken());
  } catch (e) {
    // The server answers 503 until ELEVENLABS_API_KEY and ELEVENLABS_AGENT_ID are set in app/.env.server.
    throw new Error(httpStatus(e) === 503 ? NOT_SET_UP : START_FAILED);
  }

  try {
    return await Conversation.startSession({
      conversationToken: token,
      connectionType: "webrtc",
      textOnly: false,
      ...handlers,
    });
  } catch {
    throw new Error(START_FAILED);
  }
}
