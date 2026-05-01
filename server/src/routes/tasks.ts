import { Router } from "express";
import { prisma } from "../lib/prisma.js";
import { requireAuth } from "../middleware/auth.js";
import { requireProjectMember } from "../middleware/projectAccess.js";
import { paramString } from "../lib/params.js";
import { createTaskSchema } from "../validation/schemas.js";

const router = Router({ mergeParams: true });

router.use(requireAuth, requireProjectMember);

async function assertAssigneeInProject(projectId: string, assigneeId: string | null | undefined) {
  if (assigneeId == null) return true;
  const m = await prisma.projectMember.findUnique({
    where: { projectId_userId: { projectId, userId: assigneeId } },
  });
  return !!m;
}

router.get("/", async (req, res) => {
  const projectId = paramString((req.params as { projectId: string }).projectId)!;
  const tasks = await prisma.task.findMany({
    where: { projectId },
    orderBy: { updatedAt: "desc" },
    include: {
      assignee: { select: { id: true, email: true, name: true } },
      createdBy: { select: { id: true, email: true, name: true } },
    },
  });
  res.json({ tasks });
});

router.post("/", async (req, res) => {
  const parsed = createTaskSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Validation failed", details: parsed.error.flatten() });
    return;
  }
  const projectId = paramString((req.params as { projectId: string }).projectId)!;
  const userId = req.user!.id;
  const { title, description, status, dueDate, assigneeId } = parsed.data;

  if (assigneeId) {
    const ok = await assertAssigneeInProject(projectId, assigneeId);
    if (!ok) {
      res.status(400).json({ error: "Assignee must be a project member" });
      return;
    }
  }

  const task = await prisma.task.create({
    data: {
      projectId,
      title,
      description: description ?? null,
      status: status ?? undefined,
      dueDate: dueDate ?? null,
      assigneeId: assigneeId ?? null,
      createdById: userId,
    },
    include: {
      assignee: { select: { id: true, email: true, name: true } },
      createdBy: { select: { id: true, email: true, name: true } },
    },
  });

  res.status(201).json({ task });
});

export default router;
