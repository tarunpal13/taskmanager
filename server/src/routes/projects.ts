import { Router } from "express";
import { ProjectRole } from "@prisma/client";
import { paramString } from "../lib/params.js";
import { prisma } from "../lib/prisma.js";
import { requireAuth } from "../middleware/auth.js";
import { requireProjectAdmin, requireProjectMember } from "../middleware/projectAccess.js";
import {
  addMemberSchema,
  createProjectSchema,
  updateMemberRoleSchema,
  updateProjectSchema,
} from "../validation/schemas.js";

const router = Router();

router.use(requireAuth);

router.get("/", async (req, res) => {
  const userId = req.user!.id;
  const projects = await prisma.project.findMany({
    where: {
      members: { some: { userId } },
    },
    include: {
      members: {
        include: { user: { select: { id: true, email: true, name: true } } },
      },
      _count: { select: { tasks: true } },
    },
    orderBy: { updatedAt: "desc" },
  });

  res.json({
    projects: projects.map((p) => ({
      id: p.id,
      name: p.name,
      description: p.description,
      ownerId: p.ownerId,
      createdAt: p.createdAt,
      updatedAt: p.updatedAt,
      taskCount: p._count.tasks,
      members: p.members.map((m) => ({
        id: m.id,
        userId: m.userId,
        role: m.role,
        user: m.user,
      })),
      myRole: p.members.find((m) => m.userId === userId)?.role,
    })),
  });
});

router.post("/", async (req, res) => {
  const parsed = createProjectSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Validation failed", details: parsed.error.flatten() });
    return;
  }
  const userId = req.user!.id;
  const { name, description } = parsed.data;

  const project = await prisma.$transaction(async (tx) => {
    const p = await tx.project.create({
      data: {
        name,
        description: description ?? null,
        ownerId: userId,
        members: {
          create: { userId, role: ProjectRole.ADMIN },
        },
      },
    });
    return p;
  });

  const full = await prisma.project.findUnique({
    where: { id: project.id },
    include: {
      members: { include: { user: { select: { id: true, email: true, name: true } } } },
      _count: { select: { tasks: true } },
    },
  });

  res.status(201).json({
    project: {
      id: full!.id,
      name: full!.name,
      description: full!.description,
      ownerId: full!.ownerId,
      createdAt: full!.createdAt,
      updatedAt: full!.updatedAt,
      taskCount: full!._count.tasks,
      members: full!.members.map((m) => ({
        id: m.id,
        userId: m.userId,
        role: m.role,
        user: m.user,
      })),
      myRole: ProjectRole.ADMIN,
    },
  });
});

router.get("/:projectId", requireProjectMember, async (req, res) => {
  const projectId = paramString(req.params.projectId)!;
  const userId = req.user!.id;

  const project = await prisma.project.findUnique({
    where: { id: projectId },
    include: {
      members: {
        include: { user: { select: { id: true, email: true, name: true } } },
        orderBy: { joinedAt: "asc" },
      },
      tasks: {
        orderBy: { updatedAt: "desc" },
        include: {
          assignee: { select: { id: true, email: true, name: true } },
          createdBy: { select: { id: true, email: true, name: true } },
        },
      },
    },
  });

  if (!project) {
    res.status(404).json({ error: "Project not found" });
    return;
  }

  res.json({
    project: {
      id: project.id,
      name: project.name,
      description: project.description,
      ownerId: project.ownerId,
      createdAt: project.createdAt,
      updatedAt: project.updatedAt,
      myRole: project.members.find((m) => m.userId === userId)?.role,
      members: project.members.map((m) => ({
        id: m.id,
        userId: m.userId,
        role: m.role,
        user: m.user,
      })),
      tasks: project.tasks,
    },
  });
});

router.patch("/:projectId", requireProjectMember, requireProjectAdmin, async (req, res) => {
  const parsed = updateProjectSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Validation failed", details: parsed.error.flatten() });
    return;
  }
  const projectId = paramString(req.params.projectId)!;
  const data = parsed.data;

  const project = await prisma.project.update({
    where: { id: projectId },
    data: {
      ...(data.name !== undefined && { name: data.name }),
      ...(data.description !== undefined && { description: data.description }),
    },
    include: {
      members: { include: { user: { select: { id: true, email: true, name: true } } } },
    },
  });

  const userId = req.user!.id;
  res.json({
    project: {
      id: project.id,
      name: project.name,
      description: project.description,
      ownerId: project.ownerId,
      createdAt: project.createdAt,
      updatedAt: project.updatedAt,
      myRole: project.members.find((m) => m.userId === userId)?.role,
      members: project.members.map((m) => ({
        id: m.id,
        userId: m.userId,
        role: m.role,
        user: m.user,
      })),
    },
  });
});

router.delete("/:projectId", requireProjectMember, requireProjectAdmin, async (req, res) => {
  const projectId = paramString(req.params.projectId)!;
  await prisma.project.delete({ where: { id: projectId } });
  res.status(204).send();
});

router.post("/:projectId/members", requireProjectMember, requireProjectAdmin, async (req, res) => {
  const parsed = addMemberSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Validation failed", details: parsed.error.flatten() });
    return;
  }
  const projectId = paramString(req.params.projectId)!;
  const { email, role } = parsed.data;

  const userToAdd = await prisma.user.findUnique({ where: { email: email.toLowerCase() } });
  if (!userToAdd) {
    res.status(404).json({ error: "No user found with that email" });
    return;
  }

  const existing = await prisma.projectMember.findUnique({
    where: { projectId_userId: { projectId, userId: userToAdd.id } },
  });
  if (existing) {
    res.status(409).json({ error: "User is already a member" });
    return;
  }

  const member = await prisma.projectMember.create({
    data: { projectId, userId: userToAdd.id, role },
    include: { user: { select: { id: true, email: true, name: true } } },
  });

  res.status(201).json({
    member: {
      id: member.id,
      userId: member.userId,
      role: member.role,
      user: member.user,
    },
  });
});

router.patch(
  "/:projectId/members/:memberId",
  requireProjectMember,
  requireProjectAdmin,
  async (req, res) => {
    const parsed = updateMemberRoleSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: "Validation failed", details: parsed.error.flatten() });
      return;
    }
    const projectId = paramString(req.params.projectId)!;
    const memberId = paramString(req.params.memberId)!;
    const { role } = parsed.data;

    const row = await prisma.projectMember.findFirst({
      where: { id: memberId, projectId },
      include: { user: true },
    });
    if (!row) {
      res.status(404).json({ error: "Member not found" });
      return;
    }

    const project = await prisma.project.findUnique({ where: { id: projectId } });
    if (row.userId === project?.ownerId && role === ProjectRole.MEMBER) {
      res.status(400).json({ error: "Project owner must remain an admin" });
      return;
    }

    const adminCount = await prisma.projectMember.count({
      where: { projectId, role: ProjectRole.ADMIN },
    });
    if (row.role === ProjectRole.ADMIN && role === ProjectRole.MEMBER && adminCount <= 1) {
      res.status(400).json({ error: "At least one admin is required" });
      return;
    }

    const updated = await prisma.projectMember.update({
      where: { id: memberId },
      data: { role },
      include: { user: { select: { id: true, email: true, name: true } } },
    });

    res.json({
      member: {
        id: updated.id,
        userId: updated.userId,
        role: updated.role,
        user: updated.user,
      },
    });
  }
);

router.delete(
  "/:projectId/members/:memberId",
  requireProjectMember,
  requireProjectAdmin,
  async (req, res) => {
    const projectId = paramString(req.params.projectId)!;
    const memberId = paramString(req.params.memberId)!;

    const row = await prisma.projectMember.findFirst({
      where: { id: memberId, projectId },
    });
    if (!row) {
      res.status(404).json({ error: "Member not found" });
      return;
    }

    const project = await prisma.project.findUnique({ where: { id: projectId } });
    if (row.userId === project?.ownerId) {
      res.status(400).json({ error: "Cannot remove the project owner" });
      return;
    }

    await prisma.projectMember.delete({ where: { id: memberId } });
    res.status(204).send();
  }
);

export default router;
