import OpenAI from "openai";
import type { Config } from "./config.js";
import { MODEL_JSON_SCHEMA } from "./schema.js";
import { systemPrompt, userText } from "./prompt.js";

export interface ModelClient {
  /** Returns the raw parsed JSON produced by the model. Must throw on timeout (AbortError) or transport errors. */
  inspect(args: { imageDataUrl: string; question: string; guide: string; signal: AbortSignal }): Promise<unknown>;
}

export class UpstreamError extends Error {
  constructor(message: string, public upstreamStatus?: number) {
    super(message);
  }
}

export function createOpenAIModel(cfg: Config): ModelClient {
  const client = new OpenAI({ apiKey: cfg.openaiApiKey, maxRetries: 0 });
  return {
    async inspect({ imageDataUrl, question, guide, signal }) {
      let text: string;
      try {
        const res = await client.responses.create(
          {
            model: cfg.openaiModel,
            store: false, // do not retain screenshots at OpenAI
            instructions: systemPrompt(guide),
            input: [
              {
                role: "user",
                content: [
                  { type: "input_text", text: userText(question) },
                  { type: "input_image", image_url: imageDataUrl, detail: "high" },
                ],
              },
            ],
            text: { format: { type: "json_schema", name: "inspection", strict: true, schema: MODEL_JSON_SCHEMA as unknown as Record<string, unknown> } },
            max_output_tokens: 2000, // reasoning models count reasoning tokens here
            ...(cfg.openaiReasoningEffort ? { reasoning: { effort: cfg.openaiReasoningEffort as "low" } } : {}),
          },
          { signal },
        );
        text = res.output_text;
      } catch (e) {
        if (signal.aborted) throw e;
        const { status, code } = e as { status?: number; code?: string };
        throw new UpstreamError(`OpenAI request failed${status ? ` (HTTP ${status}${code ? ` ${code}` : ""})` : ""}.`, status);
      }
      try {
        return JSON.parse(text);
      } catch {
        throw new UpstreamError("Model returned non-JSON output.");
      }
    },
  };
}
