import { Router, type IRouter } from "express";
import { db } from "@workspace/db";
import { filesTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import { logger } from "../../lib/logger";

const router: IRouter = Router();

router.get("/files", async (req, res): Promise<void> => {
  try {
    const files = await db.select().from(filesTable);
    const tree = buildTree(files);
    res.json(tree);
  } catch (err) {
    logger.error({ err }, "Error listing files");
    res.status(500).json({ error: "Failed to list files" });
  }
});

router.post("/files", async (req, res): Promise<void> => {
  const { name, type, parentId, content, language } = req.body as {
    name: string;
    type: "file" | "folder";
    parentId?: string | null;
    content?: string;
    language?: string;
  };

  if (!name || !type) {
    res.status(400).json({ error: "name and type are required" });
    return;
  }

  try {
    let parentPath = "";
    if (parentId) {
      const [parent] = await db.select().from(filesTable).where(eq(filesTable.id, parentId));
      if (parent) parentPath = parent.path;
    }

    const filePath = parentPath ? `${parentPath}/${name}` : name;
    const id = `node-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;

    const [file] = await db.insert(filesTable).values({
      id,
      name,
      type,
      path: filePath,
      parentId: parentId || null,
      content: content || "",
      language: language || null,
      isOpen: false,
    }).returning();

    res.status(201).json({ ...file, children: type === "folder" ? [] : undefined });
  } catch (err) {
    logger.error({ err }, "Error creating file");
    res.status(500).json({ error: "Failed to create file" });
  }
});

router.get("/files/:id", async (req, res): Promise<void> => {
  const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  try {
    const [file] = await db.select().from(filesTable).where(eq(filesTable.id, id));
    if (!file) {
      res.status(404).json({ error: "File not found" });
      return;
    }
    res.json(file);
  } catch (err) {
    logger.error({ err }, "Error getting file");
    res.status(500).json({ error: "Failed to get file" });
  }
});

router.patch("/files/:id", async (req, res): Promise<void> => {
  const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const { name, content, language } = req.body as {
    name?: string;
    content?: string;
    language?: string;
  };

  try {
    const [existing] = await db.select().from(filesTable).where(eq(filesTable.id, id));
    if (!existing) {
      res.status(404).json({ error: "File not found" });
      return;
    }

    const updates: Partial<typeof existing> = {};
    if (name !== undefined) {
      const parentPath = existing.path.split("/").slice(0, -1).join("/");
      updates.name = name;
      updates.path = parentPath ? `${parentPath}/${name}` : name;
    }
    if (content !== undefined) updates.content = content;
    if (language !== undefined) updates.language = language;

    const [updated] = await db.update(filesTable).set(updates).where(eq(filesTable.id, id)).returning();
    res.json(updated);
  } catch (err) {
    logger.error({ err }, "Error updating file");
    res.status(500).json({ error: "Failed to update file" });
  }
});

router.delete("/files/:id", async (req, res): Promise<void> => {
  const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  try {
    const [file] = await db.select().from(filesTable).where(eq(filesTable.id, id));
    if (!file) {
      res.status(404).json({ error: "File not found" });
      return;
    }
    await db.delete(filesTable).where(eq(filesTable.id, id));
    res.sendStatus(204);
  } catch (err) {
    logger.error({ err }, "Error deleting file");
    res.status(500).json({ error: "Failed to delete file" });
  }
});

function buildTree(files: typeof filesTable.$inferSelect[]): unknown[] {
  const byId = new Map(files.map(f => [f.id, { ...f, children: f.type === "folder" ? [] as unknown[] : undefined }]));
  const roots: unknown[] = [];
  for (const file of byId.values()) {
    if (!file.parentId) {
      roots.push(file);
    } else {
      const parent = byId.get(file.parentId);
      if (parent && parent.children) {
        parent.children.push(file);
      } else {
        roots.push(file);
      }
    }
  }
  return roots;
}

export default router;
