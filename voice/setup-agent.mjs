#!/usr/bin/env node
// OWNER: Alisa (voice). Creates or updates the LaunchPal ElevenLabs agent and its `inspect_screen`
// client tool, so the agent configuration lives in the repo instead of only in the dashboard.
//
//   node voice/setup-agent.mjs --dry-run   print the requests, no network, no key needed
//   node voice/setup-agent.mjs             create the agent (or update it when ELEVENLABS_AGENT_ID is set)
//
// Configuration is read from the environment, then from app/.env.server:
//   ELEVENLABS_API_KEY    required (server-side only; never commit it)
//   ELEVENLABS_AGENT_ID   set after the first run; when present the agent is updated in place
//   ELEVENLABS_VOICE_ID   optional voice (default: ElevenLabs' default voice)
//   ELEVENLABS_LLM        optional LLM id (default: ElevenLabs' default model)
//   LAUNCHPAL_GUIDE       optional guide path (default: services/vision/guide/acme-sync.md)
//
// The prompt (voice/system-prompt.md) and the message formats in app/src/voice/voiceAgent.ts
// (stepMessage, toolResult) depend on each other: change them together, then re-run this script.
import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const API = "https://api.elevenlabs.io";
const TOOL_NAME = "inspect_screen";
const DRY_RUN = process.argv.includes("--dry-run");

function readEnvFile(file) {
  const out = {};
  if (!existsSync(file)) return out;
  for (const line of readFileSync(file, "utf8").split(/\r?\n/)) {
    const m = /^\s*([A-Z0-9_]+)\s*=\s*(.*?)\s*$/.exec(line);
    if (m) out[m[1]] = m[2].replace(/^(['"])(.*)\1$/, "$2");
  }
  return out;
}

const fileEnv = readEnvFile(path.join(ROOT, "app", ".env.server"));
const env = (name) => (process.env[name] ?? fileEnv[name] ?? "").trim();
const isSet = (value) => value !== "" && value !== "placeholder";

const apiKey = env("ELEVENLABS_API_KEY");
const agentId = env("ELEVENLABS_AGENT_ID");
const voiceId = env("ELEVENLABS_VOICE_ID");
const llm = env("ELEVENLABS_LLM");
const guidePath = path.resolve(ROOT, env("LAUNCHPAL_GUIDE") || "services/vision/guide/acme-sync.md");

function buildPrompt() {
  const template = readFileSync(path.join(ROOT, "voice", "system-prompt.md"), "utf8");
  const guide = readFileSync(guidePath, "utf8").trim();
  if (!template.includes("<<GUIDE>>")) throw new Error("voice/system-prompt.md is missing the <<GUIDE>> marker.");
  return template.replace("<<GUIDE>>", guide).trim();
}

// Runs in the customer's helper (app/src/voice/voiceAgent.ts). It takes no parameters: the helper
// always asks the inspection service "Where do I click?" for the screen as it is right now.
const toolConfig = {
  type: "client",
  name: TOOL_NAME,
  description:
    "Looks at the customer's screen right now and draws a ring around the next control to click. " +
    "Call it whenever the customer asks what to do, where to click, what comes next, whether a step worked, " +
    "or says they are stuck. Returns JSON with `status` (point, unclear, done or error) and `say`, " +
    "the sentence to speak to the customer word for word.",
  expects_response: true,
  // The inspection proxy gives up after 15 s, so the helper always answers before this.
  response_timeout_secs: 25,
};

function agentConfig(toolId) {
  return {
    name: "LaunchPal guide",
    conversation_config: {
      agent: {
        // Empty: the agent stays quiet until the helper sends the first step, so nothing talks over it.
        first_message: "",
        language: "en",
        prompt: {
          prompt: buildPrompt(),
          ...(isSet(llm) ? { llm } : {}),
          temperature: 0,
          tool_ids: [toolId],
          built_in_tools: {
            skip_turn: { type: "system", name: "skip_turn", description: "", params: { system_tool_type: "skip_turn" } },
          },
        },
      },
      turn: {
        // The customer is often silent while they work. 30 s is the maximum; the helper also sends an
        // activity signal every 20 s, so the agent does not take a turn just because nobody spoke.
        turn_timeout: 30,
        silence_end_call_timeout: -1,
      },
      ...(isSet(voiceId) ? { tts: { voice_id: voiceId } } : {}),
      conversation: {
        max_duration_seconds: 1800,
        client_events: [
          "conversation_initiation_metadata",
          "ping",
          "audio",
          "interruption",
          "user_transcript",
          "agent_response",
          "agent_response_correction",
          "client_tool_call",
        ],
      },
    },
    // Sessions need the short-lived token minted by the Wasp server (getElevenLabsToken).
    platform_settings: { auth: { enable_auth: true } },
  };
}

async function call(method, route, body) {
  const res = await fetch(API + route, {
    method,
    headers: { "xi-api-key": apiKey, ...(body ? { "content-type": "application/json" } : {}) },
    body: body ? JSON.stringify(body) : undefined,
    signal: AbortSignal.timeout(30_000),
  });
  const text = await res.text();
  if (!res.ok) throw new Error(`${method} ${route} failed with ${res.status}: ${text.slice(0, 600)}`);
  return text ? JSON.parse(text) : {};
}

async function upsertTool() {
  const query = new URLSearchParams({ search: TOOL_NAME, types: "client", page_size: "100" });
  const { tools = [] } = await call("GET", `/v1/convai/tools?${query}`);
  const existing = tools.find((tool) => tool.tool_config?.name === TOOL_NAME);
  if (existing) {
    await call("PATCH", `/v1/convai/tools/${existing.id}`, { tool_config: toolConfig });
    console.log(`Updated client tool ${TOOL_NAME} (${existing.id}).`);
    return existing.id;
  }
  const created = await call("POST", "/v1/convai/tools", { tool_config: toolConfig });
  console.log(`Created client tool ${TOOL_NAME} (${created.id}).`);
  return created.id;
}

async function main() {
  if (DRY_RUN) {
    console.log("# client tool (POST /v1/convai/tools)");
    console.log(JSON.stringify({ tool_config: toolConfig }, null, 2));
    console.log(`# agent (${isSet(agentId) ? `PATCH /v1/convai/agents/${agentId}` : "POST /v1/convai/agents/create"})`);
    console.log(JSON.stringify(agentConfig("<tool id>"), null, 2));
    return;
  }
  if (!isSet(apiKey)) {
    console.error('ELEVENLABS_API_KEY is not set. Replace "placeholder" in app/.env.server with your key, then run this again.');
    process.exit(1);
  }

  const toolId = await upsertTool();
  const config = agentConfig(toolId);
  if (isSet(agentId)) {
    await call("PATCH", `/v1/convai/agents/${agentId}`, config);
    console.log(`Updated agent ${agentId}.`);
    return;
  }
  const { agent_id: createdId } = await call("POST", "/v1/convai/agents/create", config);
  console.log(`Created agent ${createdId}.`);
  console.log(`Add this line to app/.env.server:\n\nELEVENLABS_AGENT_ID=${createdId}\n`);
}

main().catch((e) => {
  console.error(e instanceof Error ? e.message : e);
  process.exit(1);
});
