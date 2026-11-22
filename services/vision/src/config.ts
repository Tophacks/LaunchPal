export interface Config {
  port: number;
  inspectToken: string;
  openaiApiKey: string;
  openaiModel: string;
  openaiTimeoutMs: number;
  /** Optional reasoning effort for reasoning models (e.g. "low"); unset = not sent. */
  openaiReasoningEffort?: string;
  maxImageBytes: number;
}

export const MAX_IMAGE_BYTES = 2 * 1024 * 1024;

/** Reads configuration from the environment. Throws with the variable names that are missing. */
export function loadConfig(env: NodeJS.ProcessEnv = process.env): Config {
  const missing = ["INSPECT_BEARER_TOKEN", "OPENAI_API_KEY"].filter((k) => !env[k]);
  if (missing.length) throw new Error(`Missing required environment variables: ${missing.join(", ")}`);
  const openaiModel = env.OPENAI_MODEL ?? "gpt-5.4";
  // Reasoning models need an effort setting for latency; non-reasoning models reject the parameter.
  const defaultEffort = /^(gpt-5|o\d)/.test(openaiModel) ? "low" : undefined;
  return {
    port: Number(env.PORT ?? 8080),
    inspectToken: env.INSPECT_BEARER_TOKEN!,
    openaiApiKey: env.OPENAI_API_KEY!,
    openaiModel,
    openaiTimeoutMs: Number(env.OPENAI_TIMEOUT_MS ?? 12000),
    openaiReasoningEffort: env.OPENAI_REASONING_EFFORT || defaultEffort,
    maxImageBytes: MAX_IMAGE_BYTES,
  };
}
