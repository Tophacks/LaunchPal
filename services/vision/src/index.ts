import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { loadConfig } from "./config.js";
import { createOpenAIModel } from "./model.js";
import { createServer } from "./server.js";

const config = loadConfig();
const guidePath = process.env.GUIDE_PATH ?? fileURLToPath(new URL("../guide/acme-sync.md", import.meta.url));
const guide = readFileSync(guidePath, "utf8");

createServer({ config, model: createOpenAIModel(config), guide }).listen(config.port, "0.0.0.0", () => {
  console.log(JSON.stringify({ msg: "listening", port: config.port, model: config.openaiModel }));
});
