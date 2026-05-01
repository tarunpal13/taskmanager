import { Router } from "express";
import { ProjectRole } from "@prisma/client";
import { paramString } from "../lib/params.js";
import { prisma } from "../lib/prisma.js";
import { requireAuth } from "../middleware/auth.js";
import { requireProjectMember } from "../middleware/projectAccess.js";
import { updateTaskSchema } from "../validation/schemas.js";

const router = Router({ mergeParams: true });

router.use(requireAuth, requireProjectMember);

async function getTask(projectId: string, taskId: string) {
  return prisma.task.findFirst({
    where: { id: taskId, projectId },
    include: {
      assignee: { select: { id: true, email: true, name: true } },
      createdBy: { select: { id: true, email: true, name: true } },
    },
  });
}

async function assertAssigneeInProject(projectId: string, assigneeId: string | null | undefined) {
  if (assigneeId == null) return true;
  const m = await prisma.projectMember.findUnique({
    where: { projectId_userId: { projectId, userId: assigneeId } },
  });
  return !!m;
}

router.patch("/:taskId", async (req, res) => {
  const parsed = updateTaskSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Validation failed", details: parsed.error.flatten() });
    return;
  }

  const params = req.params as { projectId: string; taskId: string };
  const projectId = paramString(params.projectId)!;
  const taskId = paramString(params.taskId)!;
  const userId = req.user!.id;
  const role = req.projectAccess!.role;
  const data = parsed.data;

  const existing = await getTask(projectId, taskId);
  if (!existing) {
    res.status(404).json({ error: "Task not found" });
    return;
  }

  if (data.assigneeId !== undefined && data.assigneeId) {
    const ok = await assertAssigneeInProject(projectId, data.assigneeId);
    if (!ok) {
      res.status(400).json({ error: "Assignee must be a project member" });
      return;
    }
  }

  const isAdmin = role === ProjectRole.ADMIN;
  const isAssignee = existing.assigneeId === userId;
  const restrictedFields =
    data.title !== undefined ||
    data.description !== undefined ||
    data.assigneeId !== undefined ||
    data.dueDate !== undefined;

  if (restrictedFields && !isAdmin && !isAssignee) {
    res.status(403).json({ error: "Only admins or the assignee can edit task details" });
    return;
  }

  if (data.status !== undefined && !isAdmin) {
    const allowed =
      isAssignee ||
      existing.assigneeId === null ||
      existing.createdById === userId;
    if (!allowed) {
      res.status(403).json({ error: "You cannot change status for this task" });
      return;
    }
  }

  const task = await prisma.task.update({
    where: { id: taskId },
    data: {
      ...(data.title !== undefined && { title: data.title }),
      ...(data.description !== undefined && { description: data.description }),
      ...(data.status !== undefined && { status: data.status }),
      ...(data.dueDate !== undefined && { dueDate: data.dueDate }),
      ...(data.assigneeId !== undefined && { assigneeId: data.assigneeId }),
    },
    include: {
      assignee: { select: { id: true, email: true, name: true } },
      createdBy: { select: { id: true, email: true, name: true } },
    },
  });

  res.json({ task });
});

router.delete("/:taskId", async (req, res) => {
  const params = req.params as { projectId: string; taskId: string };
  const projectId = paramString(params.projectId)!;
  const taskId = paramString(params.taskId)!;
  const role = req.projectAccess!.role;

  if (role !== ProjectRole.ADMIN) {
    res.status(403).json({ error: "Admin role required to delete tasks" });
    return;
  }

  const existing = await prisma.task.findFirst({ where: { id: taskId, projectId } });
  if (!existing) {
    res.status(404).json({ error: "Task not found" });
    return;
  }

  await prisma.task.delete({ where: { id: taskId } });
  res.status(204).send();
});

export default router;
