export type ProjectRole = "ADMIN" | "MEMBER";
export type TaskStatus = "TODO" | "IN_PROGRESS" | "DONE";

export type User = {
  id: string;
  email: string;
  name: string;
  createdAt?: string;
};

export type ProjectMember = {
  id: string;
  userId: string;
  role: ProjectRole;
  user: Pick<User, "id" | "email" | "name">;
};

export type Task = {
  id: string;
  projectId: string;
  title: string;
  description: string | null;
  status: TaskStatus;
  dueDate: string | null;
  assigneeId: string | null;
  createdById: string;
  createdAt: string;
  updatedAt: string;
  assignee: Pick<User, "id" | "email" | "name"> | null;
  createdBy: Pick<User, "id" | "email" | "name">;
};

export type ProjectListItem = {
  id: string;
  name: string;
  description: string | null;
  ownerId: string;
  createdAt: string;
  updatedAt: string;
  taskCount: number;
  members: ProjectMember[];
  myRole?: ProjectRole;
};

export type ProjectDetail = {
  id: string;
  name: string;
  description: string | null;
  ownerId: string;
  createdAt: string;
  updatedAt: string;
  myRole?: ProjectRole;
  members: ProjectMember[];
  tasks: Task[];
};
