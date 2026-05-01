import { Router } from "express";
import { TaskStatus } from "@prisma/client";
import { prisma } from "../lib/prisma.js";
import { requireAuth } from "../middleware/auth.js";

const router = Router();

router.use(requireAuth);

router.get("/", async (req, res) => {
  const userId = req.user!.id;
  const now = new Date();

  const memberships = await prisma.projectMember.findMany({
    where: { userId },
    select: { projectId: true },
  });
  const projectIds = memberships.map((m) => m.projectId);

  if (projectIds.length === 0) {
    res.json({
      summary: {
        totalTasks: 0,
        todo: 0,
        inProgress: 0,
        done: 0,
        overdue: 0,
        dueSoon: 0,
      },
      overdueTasks: [],
      upcomingTasks: [],
      recentProjects: [],
    });
    return;
  }

  const [totalTasks, byStatus, overdueList, upcomingList, recentProjects] = await Promise.all([
    prisma.task.count({ where: { projectId: { in: projectIds } } }),
    prisma.task.groupBy({
      by: ["status"],
      where: { projectId: { in: projectIds } },
      _count: true,
    }),
    prisma.task.findMany({
      where: {
        projectId: { in: projectIds },
        status: { not: TaskStatus.DONE },
        dueDate: { lt: now },
      },
      orderBy: { dueDate: "asc" },
      take: 20,
      include: {
        project: { select: { id: true, name: true } },
        assignee: { select: { id: true, name: true, email: true } },
      },
    }),
    prisma.task.findMany({
      where: {
        projectId: { in: projectIds },
        status: { not: TaskStatus.DONE },
        dueDate: { gte: now, lte: new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000) },
      },
      orderBy: { dueDate: "asc" },
      take: 15,
      include: {
        project: { select: { id: true, name: true } },
        assignee: { select: { id: true, name: true, email: true } },
      },
    }),
    prisma.project.findMany({
      where: { id: { in: projectIds } },
      orderBy: { updatedAt: "desc" },
      take: 8,
      include: {
        _count: { select: { tasks: true } },
        tasks: {
          where: { status: { not: TaskStatus.DONE } },
          take: 5,
          orderBy: { dueDate: "asc" },
          select: {
            id: true,
            title: true,
            status: true,
            dueDate: true,
          },
        },
      },
    }),
  ]);

  const statusMap = Object.fromEntries(byStatus.map((s) => [s.status, s._count])) as Record<
    TaskStatus,
    number
  >;

  res.json({
    summary: {
      totalTasks,
      todo: statusMap[TaskStatus.TODO] ?? 0,
      inProgress: statusMap[TaskStatus.IN_PROGRESS] ?? 0,
      done: statusMap[TaskStatus.DONE] ?? 0,
      overdue: overdueList.length,
      dueSoon: upcomingList.length,
    },
    overdueTasks: overdueList,
    upcomingTasks: upcomingList,
    recentProjects: recentProjects.map((p) => ({
      id: p.id,
      name: p.name,
      taskCount: p._count.tasks,
      openTasks: p.tasks,
    })),
  });
});

export default router;
