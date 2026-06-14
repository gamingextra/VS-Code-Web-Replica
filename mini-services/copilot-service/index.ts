/**
 * Copilot Service Entry Point
 *
 * This starts the Python FastAPI copilot service on port 3004.
 * The actual service logic lives in /backend/copilot/main.py.
 */

import { spawn } from "child_process";
import { join } from "path";

const SCRIPT_DIR = __dirname;
const COPILOT_DIR = join(SCRIPT_DIR, "..", "..", "backend", "copilot");
const VENV_DIR = join(COPILOT_DIR, ".venv");

const python = join(VENV_DIR, "bin", "python");
const mainPy = join(COPILOT_DIR, "main.py");

console.log(`[copilot-service] Starting Python copilot service on port 3004...`);
console.log(`[copilot-service] Python: ${python}`);
console.log(`[copilot-service] Entry: ${mainPy}`);

const proc = spawn(python, [mainPy], {
  cwd: COPILOT_DIR,
  stdio: "inherit",
  env: { ...process.env },
});

proc.on("error", (err) => {
  console.error(`[copilot-service] Failed to start: ${err.message}`);
  process.exit(1);
});

proc.on("exit", (code) => {
  console.log(`[copilot-service] Process exited with code ${code}`);
  process.exit(code ?? 0);
});

// Graceful shutdown
process.on("SIGTERM", () => {
  proc.kill("SIGTERM");
});
process.on("SIGINT", () => {
  proc.kill("SIGINT");
});
