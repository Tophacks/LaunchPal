export interface Config {
  port: number;
  inspectToken: string;
  openaiApiKey: string;
  openaiModel: string;
  openaiTimeoutMs: number;
  maxImageBytes: number;
}

export const MAX_IMAGE_BYTES = 2 * 1024 * 1024;

/** Reads configuration from the environment. Throws with the variable names that are missing. */
export function loadConfig(env: NodeJS.ProcessEnv = process.env): Config {
  const missing = ["INSPECT_BEARER_TOKEN", "OPENAI_API_KEY"].filter((k) => !env[k]);
  if (missing.length) throw new Error(`Missing required environment variables: ${missing.join(", ")}`);
  return {
    port: Number(env.PORT ?? 8080),
    inspectToken: env.INSPECT_BEARER_TOKEN!,
    openaiApiKey: env.OPENAI_API_KEY!,
    openaiModel: env.OPENAI_MODEL ?? "gpt-4.1",
    openaiTimeoutMs: Number(env.OPENAI_TIMEOUT_MS ?? 20000),
    maxImageBytes: MAX_IMAGE_BYTES,
  };
}
