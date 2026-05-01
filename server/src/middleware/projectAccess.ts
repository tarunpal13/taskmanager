import type { Request, Response, NextFunction } from "express";
import { ProjectRole } from "@prisma/client";
import { paramString } from "../lib/params.js";
import { prisma } from "../lib/prisma.js";

export type ProjectAccess = {
  role: ProjectRole;
  projectId: string;
};

declare global {
  namespace Express {
    interface Request {
      projectAccess?: ProjectAccess;
    }
  }
}

export async function requireProjectMember(req: Request, res: Response, next: NextFunction) {
  const projectId = paramString(req.params.projectId);
  const userId = req.user?.id;
  if (!userId || !projectId) {
    res.status(400).json({ error: "Invalid request" });
    return;
  }

  const membership = await prisma.projectMember.findUnique({
    where: { projectId_userId: { projectId, userId } },
    select: { role: true },
  });

  if (!membership) {
    res.status(403).json({ error: "You are not a member of this project" });
    return;
  }

  req.projectAccess = { role: membership.role, projectId };
  next();
}

export function requireProjectAdmin(req: Request, res: Response, next: NextFunction) {
  if (req.projectAccess?.role !== ProjectRole.ADMIN) {
    res.status(403).json({ error: "Admin role required" });
    return;
  }
  next();
}
