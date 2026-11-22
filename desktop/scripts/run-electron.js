// Launches Electron with a clean env. Terminals inside VS Code/Electron hosts can inherit
// ELECTRON_RUN_AS_NODE=1, which makes Electron start as plain Node and crash on `app`.
const { spawn } = require("node:child_process");
const path = require("node:path");
const electron = require("electron"); // path to the Electron binary

const env = { ...process.env };
delete env.ELECTRON_RUN_AS_NODE;
// --record: let screen recorders see the ring (demo videos).
const args = process.argv.slice(2).filter((a) => a !== "--record");
if (args.length !== process.argv.length - 2) env.LAUNCHPAL_RECORDING = "1";

const child = spawn(electron, [path.join(__dirname, ".."), ...args], {
  stdio: "inherit",
  env,
});
child.on("exit", (code) => process.exit(code ?? 0));
for (const sig of ["SIGINT", "SIGTERM"]) process.on(sig, () => child.kill(sig));
