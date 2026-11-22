// Wasp action: fetches a short-lived ElevenLabs conversation token server-side (API key never reaches the client).
import { HttpError } from "wasp/server";
import type { GetElevenLabsToken } from "wasp/server/operations";

export const getElevenLabsToken: GetElevenLabsToken<void, { token: string; agentId: string }> = async () => {
  const apiKey = (process.env.ELEVENLABS_API_KEY || "").trim();
  const agentId = (process.env.ELEVENLABS_AGENT_ID || "").trim();
  if (!apiKey || !agentId) {
    console.error("[voice] ELEVENLABS_API_KEY / ELEVENLABS_AGENT_ID not set");
    throw new HttpError(503, "Voice isn't set up yet.");
  }
  try {
    const res = await fetch(
      `https://api.elevenlabs.io/v1/convai/conversation/token?agent_id=${encodeURIComponent(agentId)}`,
      { headers: { "xi-api-key": apiKey }, signal: AbortSignal.timeout(10_000) },
    );
    if (!res.ok) {
      console.warn(`[voice] token request failed: ${res.status}`);
      throw new HttpError(502, "Couldn't start voice — try again.");
    }
    const body = (await res.json()) as { token?: string };
    if (!body.token) throw new HttpError(502, "Couldn't start voice — try again.");
    return { token: body.token, agentId };
  } catch (e) {
    if (e instanceof HttpError) throw e;
    console.warn("[voice] token request error");
    throw new HttpError(502, "Couldn't start voice — try again.");
  }
};
