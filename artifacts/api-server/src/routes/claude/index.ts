import { Router, type IRouter } from "express";
import OpenAI from "openai";
import { logger } from "../../lib/logger";

const router: IRouter = Router();

const client = new OpenAI({
  apiKey: process.env.ANTHROPIC_API_KEY,
  baseURL: "https://integrate.api.nvidia.com/v1",
});

// Use a strong coding-focused model available on NVIDIA NIM
const MODEL = "meta/llama-3.3-70b-instruct";

const SYSTEM_PROMPT = `You are an AI coding assistant integrated into a VS Code-like terminal editor.
Help users with coding tasks, debugging, and writing code.
When showing code, use markdown code blocks with language identifiers.
Be concise but thorough. Use tool indicators like ● Read(file), ● Edit(file), ● Bash(cmd) to show your work steps before the result.`;

router.post("/claude/chat", async (req, res): Promise<void> => {
  const { message, history, systemPrompt } = req.body as {
    message: string;
    history?: Array<{ role: "user" | "assistant"; content: string }>;
    systemPrompt?: string;
  };

  if (!message || typeof message !== "string") {
    res.status(400).json({ error: "message is required" });
    return;
  }

  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache");
  res.setHeader("Connection", "keep-alive");
  res.setHeader("X-Accel-Buffering", "no");

  const messages: OpenAI.ChatCompletionMessageParam[] = [
    { role: "system", content: systemPrompt || SYSTEM_PROMPT },
    ...(history || []).map((h) => ({
      role: h.role as "user" | "assistant",
      content: h.content,
    })),
    { role: "user", content: message },
  ];

  try {
    const stream = await client.chat.completions.create({
      model: MODEL,
      max_tokens: 4096,
      messages,
      stream: true,
    });

    for await (const chunk of stream) {
      const delta = chunk.choices[0]?.delta?.content;
      if (delta) {
        res.write(`data: ${JSON.stringify({ content: delta })}\n\n`);
      }
    }

    res.write(`data: ${JSON.stringify({ done: true })}\n\n`);
    res.end();
  } catch (err) {
    logger.error({ err }, "AI streaming error");
    res.write(`data: ${JSON.stringify({ error: "AI API error: " + String(err instanceof Error ? err.message : err), done: true })}\n\n`);
    res.end();
  }
});

export default router;
