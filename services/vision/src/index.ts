import { fileURLToPath } from "node:url";
import { loadConfig } from "./config.js";
import { fileGuideStore } from "./guides.js";
import { createOpenAIModel } from "./model.js";
import { createServer } from "./server.js";

const config = loadConfig();
const guides = fileGuideStore(fileURLToPath(new URL("../guide", import.meta.url)), process.env.DEFAULT_GUIDE_ID ?? "acme-sync", process.env.GUIDE_PATH);

createServer({ config, model: createOpenAIModel(config), guides }).listen(config.port, "0.0.0.0", () => {
  console.log(JSON.stringify({ msg: "listening", port: config.port, model: config.openaiModel }));
});
