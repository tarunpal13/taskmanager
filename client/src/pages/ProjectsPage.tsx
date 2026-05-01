import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { api } from "@/api";
import type { ProjectListItem } from "@/types";

export function ProjectsPage() {
  const [projects, setProjects] = useState<ProjectListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [creating, setCreating] = useState(false);

  async function load() {
    try {
      const res = await api<{ projects: ProjectListItem[] }>("/api/projects");
      setProjects(res.projects);
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void load();
  }, []);

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) return;
    setCreating(true);
    try {
      await api("/api/projects", {
        method: "POST",
        json: { name: name.trim(), description: description.trim() || null },
      });
      setName("");
      setDescription("");
      await load();
    } catch (err) {
      alert(err instanceof Error ? err.message : "Failed");
    } finally {
      setCreating(false);
    }
  }

  if (loading) return <p className="text-zinc-500">Loading projects…</p>;
  if (error) return <p className="text-red-400">{error}</p>;

  return (
    <div className="space-y-10">
      <div>
        <h1 className="text-2xl font-bold text-white">Projects</h1>
        <p className="text-zinc-500 mt-1">Create a project and invite teammates by email</p>
      </div>

      <form
        onSubmit={handleCreate}
        className="rounded-xl border border-zinc-800 bg-zinc-900/40 p-6 space-y-4 max-w-xl"
      >
        <h2 className="font-semibold text-white">New project</h2>
        <div>
          <label className="block text-sm text-zinc-400 mb-1">Name</label>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="w-full rounded-lg bg-zinc-950 border border-zinc-700 px-3 py-2 text-white focus:outline-none focus:ring-2 focus:ring-brand-600"
            placeholder="Product launch"
            required
          />
        </div>
        <div>
          <label className="block text-sm text-zinc-400 mb-1">Description (optional)</label>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={2}
            className="w-full rounded-lg bg-zinc-950 border border-zinc-700 px-3 py-2 text-white focus:outline-none focus:ring-2 focus:ring-brand-600 resize-none"
          />
        </div>
        <button
          type="submit"
          disabled={creating}
          className="px-4 py-2 rounded-lg bg-brand-600 hover:bg-brand-500 text-white text-sm font-medium disabled:opacity-50"
        >
          {creating ? "Creating…" : "Create project"}
        </button>
      </form>

      <div className="space-y-3">
        <h2 className="font-semibold text-white">Your projects</h2>
        {projects.length === 0 ? (
          <p className="text-zinc-500 text-sm">No projects yet. Create one above.</p>
        ) : (
          <ul className="divide-y divide-zinc-800 rounded-xl border border-zinc-800 overflow-hidden">
            {projects.map((p) => (
              <li key={p.id}>
                <Link
                  to={`/projects/${p.id}`}
                  className="flex items-center justify-between gap-4 px-4 py-4 bg-zinc-900/30 hover:bg-zinc-900/60 transition-colors"
                >
                  <div>
                    <div className="font-medium text-white">{p.name}</div>
                    {p.description && (
                      <div className="text-sm text-zinc-500 line-clamp-1 mt-0.5">{p.description}</div>
                    )}
                  </div>
                  <div className="text-right text-xs text-zinc-500 shrink-0">
                    <div>{p.taskCount} tasks</div>
                    <div className="text-brand-400/90">{p.myRole === "ADMIN" ? "Admin" : "Member"}</div>
                  </div>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
