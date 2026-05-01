import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { api } from "@/api";
import type { Task, TaskStatus } from "@/types";

type DashboardData = {
  summary: {
    totalTasks: number;
    todo: number;
    inProgress: number;
    done: number;
    overdue: number;
    dueSoon: number;
  };
  overdueTasks: (Task & { project: { id: string; name: string } })[];
  upcomingTasks: (Task & { project: { id: string; name: string } })[];
  recentProjects: {
    id: string;
    name: string;
    taskCount: number;
    openTasks: { id: string; title: string; status: TaskStatus; dueDate: string | null }[];
  }[];
};

function statusLabel(s: TaskStatus) {
  switch (s) {
    case "TODO":
      return "To do";
    case "IN_PROGRESS":
      return "In progress";
    case "DONE":
      return "Done";
    default:
      return s;
  }
}

function formatDate(iso: string | null) {
  if (!iso) return "—";
  const d = new Date(iso);
  return d.toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" });
}

export function DashboardPage() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await api<DashboardData>("/api/dashboard");
        if (!cancelled) setData(res);
      } catch (e) {
        if (!cancelled) setError(e instanceof Error ? e.message : "Failed to load");
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  if (error) {
    return <p className="text-red-400">{error}</p>;
  }
  if (!data) {
    return <p className="text-zinc-500">Loading dashboard…</p>;
  }

  const { summary } = data;

  return (
    <div className="space-y-10">
      <div>
        <h1 className="text-2xl font-bold text-white">Dashboard</h1>
        <p className="text-zinc-500 mt-1">Tasks and deadlines across your projects</p>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard label="Total tasks" value={summary.totalTasks} />
        <StatCard label="To do" value={summary.todo} accent="zinc" />
        <StatCard label="In progress" value={summary.inProgress} accent="amber" />
        <StatCard label="Done" value={summary.done} accent="emerald" />
      </div>

      <div className="grid md:grid-cols-2 gap-4">
        <div className="rounded-xl border border-red-900/50 bg-red-950/20 p-5">
          <h2 className="font-semibold text-red-200 flex items-center gap-2">
            Overdue
            <span className="text-xs font-normal text-red-400/80">not completed, past due</span>
          </h2>
          {data.overdueTasks.length === 0 ? (
            <p className="text-sm text-zinc-500 mt-3">Nothing overdue. Nice work.</p>
          ) : (
            <ul className="mt-4 space-y-3">
              {data.overdueTasks.map((t) => (
                <li key={t.id} className="text-sm">
                  <Link
                    to={`/projects/${t.project.id}`}
                    className="text-white hover:text-brand-400 font-medium"
                  >
                    {t.title}
                  </Link>
                  <div className="text-zinc-500 text-xs mt-0.5">
                    {t.project.name} · due {formatDate(t.dueDate)}
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
        <div className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-5">
          <h2 className="font-semibold text-white">Due in the next 7 days</h2>
          {data.upcomingTasks.length === 0 ? (
            <p className="text-sm text-zinc-500 mt-3">No upcoming deadlines this week.</p>
          ) : (
            <ul className="mt-4 space-y-3">
              {data.upcomingTasks.map((t) => (
                <li key={t.id} className="text-sm">
                  <Link
                    to={`/projects/${t.project.id}`}
                    className="text-white hover:text-brand-400 font-medium"
                  >
                    {t.title}
                  </Link>
                  <div className="text-zinc-500 text-xs mt-0.5">
                    {t.project.name} · {formatDate(t.dueDate)}
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>

      <div>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-white">Recent projects</h2>
          <Link to="/projects" className="text-sm text-brand-400 hover:text-brand-300">
            View all
          </Link>
        </div>
        {data.recentProjects.length === 0 ? (
          <div className="rounded-xl border border-zinc-800 bg-zinc-900/30 p-8 text-center">
            <p className="text-zinc-500">You are not in any projects yet.</p>
            <Link
              to="/projects"
              className="inline-block mt-4 text-brand-400 hover:text-brand-300 font-medium"
            >
              Create a project
            </Link>
          </div>
        ) : (
          <div className="grid sm:grid-cols-2 gap-4">
            {data.recentProjects.map((p) => (
              <Link
                key={p.id}
                to={`/projects/${p.id}`}
                className="rounded-xl border border-zinc-800 bg-zinc-900/40 p-5 hover:border-brand-700/50 transition-colors"
              >
                <div className="font-medium text-white">{p.name}</div>
                <div className="text-xs text-zinc-500 mt-1">{p.taskCount} tasks total</div>
                {p.openTasks.length > 0 && (
                  <ul className="mt-3 space-y-1.5 text-sm text-zinc-400">
                    {p.openTasks.map((t) => (
                      <li key={t.id} className="truncate">
                        <span className="text-zinc-600">{statusLabel(t.status)}:</span> {t.title}
                      </li>
                    ))}
                  </ul>
                )}
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function StatCard({
  label,
  value,
  accent = "brand",
}: {
  label: string;
  value: number;
  accent?: "brand" | "zinc" | "amber" | "emerald";
}) {
  const ring =
    accent === "brand"
      ? "border-brand-800/50"
      : accent === "amber"
        ? "border-amber-900/50"
        : accent === "emerald"
          ? "border-emerald-900/50"
          : "border-zinc-800";
  return (
    <div className={`rounded-xl border ${ring} bg-zinc-900/50 p-4`}>
      <div className="text-2xl font-bold text-white tabular-nums">{value}</div>
      <div className="text-xs text-zinc-500 uppercase tracking-wide mt-1">{label}</div>
    </div>
  );
}
