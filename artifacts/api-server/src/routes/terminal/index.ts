import { Router, type IRouter } from "express";
import { spawn } from "child_process";
import path from "path";
import fs from "fs";

const router: IRouter = Router();

const WORKSPACE_DIR = path.resolve("/home/runner/workspace/artifacts/api-server/workspace");

// Ensure workspace exists
if (!fs.existsSync(WORKSPACE_DIR)) {
  fs.mkdirSync(WORKSPACE_DIR, { recursive: true });
}

function sanitizeCwd(cwd: string): string {
  if (!cwd || cwd === "/home/user/workspace" || cwd === "~") {
    return WORKSPACE_DIR;
  }
  if (cwd.startsWith("/home/user/workspace")) {
    const rel = cwd.replace("/home/user/workspace", "");
    return path.resolve(WORKSPACE_DIR, "." + rel);
  }
  if (!path.isAbsolute(cwd)) {
    return path.resolve(WORKSPACE_DIR, cwd);
  }
  return cwd;
}

function displayCwd(resolved: string): string {
  return resolved.startsWith(WORKSPACE_DIR)
    ? "/home/user/workspace" + resolved.slice(WORKSPACE_DIR.length)
    : resolved;
}

router.post("/terminal/exec", async (req, res): Promise<void> => {
  const { command, cwd } = req.body as { command: string; cwd?: string };

  if (!command || typeof command !== "string") {
    res.status(400).json({ error: "command is required" });
    return;
  }

  const resolvedCwd = sanitizeCwd(cwd || WORKSPACE_DIR);

  await new Promise<void>((resolve) => {
    let stdout = "";
    let stderr = "";

    const sh = process.env.SHELL || "/usr/bin/bash";
    const child = spawn(sh, ["-c", command], {
      cwd: resolvedCwd,
      env: {
        ...process.env,
        HOME: "/home/runner",
        TERM: "xterm-256color",
        PATH: process.env.PATH || "/usr/local/bin:/usr/bin:/bin",
      },
      timeout: 15000,
    });

    child.stdout.on("data", (chunk: Buffer) => { stdout += chunk.toString(); });
    child.stderr.on("data", (chunk: Buffer) => { stderr += chunk.toString(); });

    child.on("close", (code) => {
      res.json({
        stdout: stdout.trimEnd(),
        stderr: stderr.trimEnd(),
        exitCode: code ?? 0,
        cwd: displayCwd(resolvedCwd),
      });
      resolve();
    });

    child.on("error", (err) => {
      res.json({
        stdout: "",
        stderr: `Failed to run command: ${err.message}`,
        exitCode: 1,
        cwd: displayCwd(resolvedCwd),
      });
      resolve();
    });
  });
});

export default router;
