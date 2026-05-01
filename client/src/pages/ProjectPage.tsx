import { useCallback, useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { api } from "@/api";
import { useAuth } from "@/context/AuthContext";
import type { ProjectDetail, ProjectMember, ProjectRole, Task, TaskStatus } from "@/types";

const STATUSES: TaskStatus[] = ["TODO", "IN_PROGRESS", "DONE"];

function formatDate(iso: string | null) {
  if (!iso) return "";
  return new Date(iso).toISOString().slice(0, 10);
}

export function ProjectPage() {
  const { user } = useAuth();
  const { projectId } = useParams<{ projectId: string }>();
  const navigate = useNavigate();
  const [project, setProject] = useState<ProjectDetail | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    if (!projectId) return;
    try {
      const res = await api<{ project: ProjectDetail }>(`/api/projects/${projectId}`);
      setProject(res.project);
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load");
      setProject(null);
    } finally {
      setLoading(false);
    }
  }, [projectId]);

  useEffect(() => {
    void load();
  }, [load]);

  const isAdmin = project?.myRole === "ADMIN";

  async function updateProject(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!projectId || !isAdmin) return;
    const fd = new FormData(e.currentTarget);
    const name = String(fd.get("name") ?? "").trim();
    const description = String(fd.get("description") ?? "");
    try {
      await api(`/api/projects/${projectId}`, {
        method: "PATCH",
        json: { name, description: description || null },
      });
      await load();
    } catch (err) {
      alert(err instanceof Error ? err.message : "Update failed");
    }
  }

  async function deleteProject() {
    if (!projectId || !isAdmin) return;
    if (!confirm("Delete this project and all tasks?")) return;
    try {
      await api(`/api/projects/${projectId}`, { method: "DELETE" });
      navigate("/projects", { replace: true });
    } catch (err) {
      alert(err instanceof Error ? err.message : "Delete failed");
    }
  }

  async function addMember(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!projectId || !isAdmin) return;
    const fd = new FormData(e.currentTarget);
    const email = String(fd.get("email") ?? "").trim();
    const role = String(fd.get("role") ?? "MEMBER") as ProjectRole;
    try {
      await api(`/api/projects/${projectId}/members`, {
        method: "POST",
        json: { email, role },
      });
      e.currentTarget.reset();
      await load();
    } catch (err) {
      alert(err instanceof Error ? err.message : "Invite failed");
    }
  }

  async function changeMemberRole(member: ProjectMember, role: ProjectRole) {
    if (!projectId || !isAdmin) return;
    try {
      await api(`/api/projects/${projectId}/members/${member.id}`, {
        method: "PATCH",
        json: { role },
      });
      await load();
    } catch (err) {
      alert(err instanceof Error ? err.message : "Failed");
    }
  }

  async function removeMember(member: ProjectMember) {
    if (!projectId || !isAdmin) return;
    if (!confirm(`Remove ${member.user.name} from the project?`)) return;
    try {
      await api(`/api/projects/${projectId}/members/${member.id}`, { method: "DELETE" });
      await load();
    } catch (err) {
      alert(err instanceof Error ? err.message : "Failed");
    }
  }

  async function createTask(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!projectId) return;
    const fd = new FormData(e.currentTarget);
    const title = String(fd.get("title") ?? "").trim();
    const due = String(fd.get("dueDate") ?? "");
    const assigneeId = String(fd.get("assigneeId") ?? "") || null;
    try {
      await api(`/api/projects/${projectId}/tasks`, {
        method: "POST",
        json: {
          title,
          dueDate: due ? new Date(due).toISOString() : null,
          assigneeId,
        },
      });
      e.currentTarget.reset();
      await load();
    } catch (err) {
      alert(err instanceof Error ? err.message : "Failed");
    }
  }

  async function patchTask(task: Task, patch: Partial<{ status: TaskStatus; assigneeId: string | null }>) {
    if (!projectId) return;
    try {
      await api(`/api/projects/${projectId}/tasks/${task.id}`, {
        method: "PATCH",
        json: patch,
      });
      await load();
    } catch (err) {
      alert(err instanceof Error ? err.message : "Failed");
    }
  }

  async function deleteTask(task: Task) {
    if (!projectId || !isAdmin) return;
    if (!confirm(`Delete task "${task.title}"?`)) return;
    try {
      await api(`/api/projects/${projectId}/tasks/${task.id}`, { method: "DELETE" });
      await load();
    } catch (err) {
      alert(err instanceof Error ? err.message : "Failed");
    }
  }

  if (loading) return <p className="text-zinc-500">Loading…</p>;
  if (error || !project) {
    return (
      <div className="space-y-4">
        <p className="text-red-400">{error ?? "Not found"}</p>
        <Link to="/projects" className="text-brand-400 hover:text-brand-300">
          ← Back to projects
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-10">
      <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
        <div>
          <Link to="/projects" className="text-sm text-zinc-500 hover:text-brand-400">
            ← Projects
          </Link>
          <h1 className="text-2xl font-bold text-white mt-2">{project.name}</h1>
          {project.description && <p className="text-zinc-400 mt-2 max-w-2xl">{project.description}</p>}
          <p className="text-xs text-zinc-600 mt-2">
            Your role:{" "}
            <span className="text-brand-400">{project.myRole === "ADMIN" ? "Admin" : "Member"}</span>
          </p>
        </div>
        {isAdmin && (
          <button
            type="button"
            onClick={deleteProject}
            className="text-sm text-red-400 hover:text-red-300 border border-red-900/50 rounded-lg px-3 py-2 self-start"
          >
            Delete project
          </button>
        )}
      </div>

      {isAdmin && (
        <section className="rounded-xl border border-zinc-800 bg-zinc-900/40 p-6 max-w-xl">
          <h2 className="font-semibold text-white mb-4">Project settings</h2>
          <form onSubmit={updateProject} className="space-y-3">
            <div>
              <label className="block text-sm text-zinc-400 mb-1">Name</label>
              <input
                name="name"
                defaultValue={project.name}
                className="w-full rounded-lg bg-zinc-950 border border-zinc-700 px-3 py-2 text-white"
                required
              />
            </div>
            <div>
              <label className="block text-sm text-zinc-400 mb-1">Description</label>
              <textarea
                name="description"
                defaultValue={project.description ?? ""}
                rows={2}
                className="w-full rounded-lg bg-zinc-950 border border-zinc-700 px-3 py-2 text-white resize-none"
              />
            </div>
            <button
              type="submit"
              className="px-4 py-2 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-white text-sm"
            >
              Save changes
            </button>
          </form>
        </section>
      )}

      <section className="rounded-xl border border-zinc-800 bg-zinc-900/40 p-6">
        <h2 className="font-semibold text-white mb-4">Team</h2>
        {isAdmin && (
          <form onSubmit={addMember} className="flex flex-wrap gap-3 items-end mb-6">
            <div className="flex-1 min-w-[12rem]">
              <label className="block text-sm text-zinc-400 mb-1">Invite by email</label>
              <input
                name="email"
                type="email"
                required
                placeholder="colleague@company.com"
                className="w-full rounded-lg bg-zinc-950 border border-zinc-700 px-3 py-2 text-white"
              />
            </div>
            <div>
              <label className="block text-sm text-zinc-400 mb-1">Role</label>
              <select
                name="role"
                className="rounded-lg bg-zinc-950 border border-zinc-700 px-3 py-2 text-white"
              >
                <option value="MEMBER">Member</option>
                <option value="ADMIN">Admin</option>
              </select>
            </div>
            <button
              type="submit"
              className="px-4 py-2 rounded-lg bg-brand-600 hover:bg-brand-500 text-white text-sm h-[42px]"
            >
              Add member
            </button>
          </form>
        )}
        <ul className="divide-y divide-zinc-800 border border-zinc-800 rounded-lg overflow-hidden">
          {project.members.map((m) => (
            <li key={m.id} className="flex items-center justify-between gap-3 px-4 py-3 bg-zinc-950/50">
              <div>
                <div className="text-white font-medium">{m.user.name}</div>
                <div className="text-xs text-zinc-500">{m.user.email}</div>
              </div>
              <div className="flex items-center gap-2">
                {isAdmin ? (
                  <>
                    <select
                      value={m.role}
                      onChange={(e) => changeMemberRole(m, e.target.value as ProjectRole)}
                      className="text-sm rounded-md bg-zinc-900 border border-zinc-700 px-2 py-1 text-white"
                    >
                      <option value="MEMBER">Member</option>
                      <option value="ADMIN">Admin</option>
                    </select>
                    <button
                      type="button"
                      onClick={() => removeMember(m)}
                      className="text-xs text-red-400 hover:text-red-300 px-2"
                    >
                      Remove
                    </button>
                  </>
                ) : (
                  <span className="text-xs text-brand-400">{m.role === "ADMIN" ? "Admin" : "Member"}</span>
                )}
              </div>
            </li>
          ))}
        </ul>
      </section>

      <section className="rounded-xl border border-zinc-800 bg-zinc-900/40 p-6">
        <h2 className="font-semibold text-white mb-4">Tasks</h2>
        <form onSubmit={createTask} className="grid sm:grid-cols-2 lg:grid-cols-4 gap-3 mb-8 items-end">
          <div className="sm:col-span-2">
            <label className="block text-sm text-zinc-400 mb-1">Title</label>
            <input
              name="title"
              required
              placeholder="Design review"
              className="w-full rounded-lg bg-zinc-950 border border-zinc-700 px-3 py-2 text-white"
            />
          </div>
          <div>
            <label className="block text-sm text-zinc-400 mb-1">Due date</label>
            <input
              name="dueDate"
              type="date"
              className="w-full rounded-lg bg-zinc-950 border border-zinc-700 px-3 py-2 text-white"
            />
          </div>
          <div>
            <label className="block text-sm text-zinc-400 mb-1">Assignee</label>
            <select
              name="assigneeId"
              className="w-full rounded-lg bg-zinc-950 border border-zinc-700 px-3 py-2 text-white"
            >
              <option value="">Unassigned</option>
              {project.members.map((m) => (
                <option key={m.userId} value={m.userId}>
                  {m.user.name}
                </option>
              ))}
            </select>
          </div>
          <div className="sm:col-span-2 lg:col-span-4">
            <button
              type="submit"
              className="px-4 py-2 rounded-lg bg-brand-600 hover:bg-brand-500 text-white text-sm"
            >
              Add task
            </button>
          </div>
        </form>

        {project.tasks.length === 0 ? (
          <p className="text-zinc-500 text-sm">No tasks yet.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-zinc-500 border-b border-zinc-800">
                  <th className="pb-2 pr-4">Task</th>
                  <th className="pb-2 pr-4">Status</th>
                  <th className="pb-2 pr-4">Assignee</th>
                  <th className="pb-2 pr-4">Due</th>
                  {isAdmin && <th className="pb-2" />}
                </tr>
              </thead>
              <tbody>
                {project.tasks.map((t) => (
                  <tr key={t.id} className="border-b border-zinc-800/80">
                    <td className="py-3 pr-4 text-white font-medium">{t.title}</td>
                    <td className="py-3 pr-4">
                      <select
                        value={t.status}
                        onChange={(e) => patchTask(t, { status: e.target.value as TaskStatus })}
                        className="rounded-md bg-zinc-950 border border-zinc-700 px-2 py-1 text-white text-xs"
                      >
                        {STATUSES.map((s) => (
                          <option key={s} value={s}>
                            {s.replace("_", " ")}
                          </option>
                        ))}
                      </select>
                    </td>
                    <td className="py-3 pr-4">
                      <select
                        value={t.assigneeId ?? ""}
                        onChange={(e) =>
                          patchTask(t, { assigneeId: e.target.value || null })
                        }
                        disabled={!isAdmin && t.assigneeId !== user?.id}
                        className="rounded-md bg-zinc-950 border border-zinc-700 px-2 py-1 text-white text-xs max-w-[10rem]"
                      >
                        <option value="">—</option>
                        {project.members.map((m) => (
                          <option key={m.userId} value={m.userId}>
                            {m.user.name}
                          </option>
                        ))}
                      </select>
                    </td>
                    <td className="py-3 pr-4 text-zinc-400 tabular-nums">
                      {formatDate(t.dueDate) || "—"}
                    </td>
                    {isAdmin && (
                      <td className="py-3">
                        <button
                          type="button"
                          onClick={() => deleteTask(t)}
                          className="text-red-400 hover:text-red-300 text-xs"
                        >
                          Delete
                        </button>
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}
