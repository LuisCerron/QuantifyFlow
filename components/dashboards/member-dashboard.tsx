"use client";

import React, { useMemo } from "react";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { UserDashboardData } from "@/types/dashboard-types";
import type { TaskWithDetails, Subtask } from "@/types";
import { Timestamp } from "firebase/firestore";
import {
  Loader2,
  ListChecks,
  Clock,
  Activity as ActivityIcon,
  CheckCircle2,
  Square,
  CheckSquare,
  Users,
  History,
  Calendar,
} from "lucide-react";

// --- Utils robustos (Date | Timestamp | {seconds,nanoseconds} | string | number) ---

const toDateSafe = (value?: any): Date | null => {
  if (!value) return null;
  if (value instanceof Date) return isNaN(value.getTime()) ? null : value;
  if (typeof value?.toDate === "function") {
    try {
      const d = (value as Timestamp).toDate();
      return isNaN(d.getTime()) ? null : d;
    } catch {
      return null;
    }
  }
  if (typeof value === "object" && "seconds" in value) {
    const s = Number(value.seconds);
    const n = Number(value.nanoseconds ?? 0);
    const d = new Date(s * 1000 + Math.floor(n / 1e6));
    return isNaN(d.getTime()) ? null : d;
    }
  const d = new Date(value);
  return isNaN(d.getTime()) ? null : d;
};

const formatDate = (dateValue?: any, locale = "es-PE"): string | null => {
  const d = toDateSafe(dateValue);
  if (!d) return null;
  return d.toLocaleDateString(locale, { day: "2-digit", month: "2-digit", year: "numeric" });
};

// --- Micro componentes ---

type IconType = React.ComponentType<React.SVGProps<SVGSVGElement>>;

const StatCard = ({
  title,
  value,
  Icon,
  gradient = "from-indigo-500 via-violet-500 to-fuchsia-500",
}: {
  title: string;
  value: string | number;
  Icon: IconType;
  gradient?: string;
}) => (
  <div className="group relative overflow-hidden rounded-2xl p-5 ring-2 ring-neutral-300/90 transition hover:ring-violet-500/60 dark:ring-white/20">
    <div className={cn("absolute inset-0 opacity-10 blur-2xl bg-gradient-to-r", gradient)} />
    <div className="relative z-10 flex items-center gap-4">
      <div className={cn("rounded-xl p-3 text-white shadow-sm bg-gradient-to-br", gradient)}>
        <Icon className="h-5 w-5" />
      </div>
      <div>
        <p className="text-xs text-muted-foreground">{title}</p>
        <p className="text-2xl font-bold tracking-tight">{value}</p>
      </div>
    </div>
  </div>
);

const PriorityChip = ({ priority }: { priority?: string }) => {
  const p = String(priority || "").toLowerCase();
  const map: Record<string, string> = {
    alta: "text-rose-500 ring-rose-500/40",
    high: "text-rose-500 ring-rose-500/40",
    media: "text-amber-600 ring-amber-500/40",
    medium: "text-amber-600 ring-amber-500/40",
    baja: "text-sky-600 ring-sky-500/40",
    low: "text-sky-600 ring-sky-500/40",
  };
  const cls = map[p] || "text-muted-foreground ring-neutral-300/80 dark:ring-white/20";
  return <span className={cn("rounded-full px-2 py-0.5 text-[10px] font-medium ring-2", cls)}>{priority}</span>;
};

const StatusBadge = ({ status }: { status?: string }) => {
  const s = String(status || "").toLowerCase();
  const label = s.replace(/-/g, " ") || "—";
  return (
    <span className="rounded-full px-2 py-0.5 text-[10px] font-medium ring-2 ring-neutral-300/80 text-muted-foreground dark:ring-white/20">
      {label}
    </span>
  );
};

const TaskCard = ({ task }: { task: TaskWithDetails }) => {
  const due = formatDate(task.dueDate);
  const subtasks = Array.isArray(task.subtasks) ? task.subtasks : [];
  const done = subtasks.filter((s) => s.completed).length;
  const pct = subtasks.length ? Math.round((done / subtasks.length) * 100) : 0;

  const accent =
    task.status === "done"
      ? "bg-emerald-500"
      : task.status === "in-progress"
      ? "bg-indigo-500"
      : "bg-violet-500";

  return (
    <article
      className={cn(
        "relative rounded-2xl p-4 transition-all",
        "ring-2 ring-neutral-300/90 hover:ring-violet-500/60 dark:ring-white/20"
      )}
    >
      <span className={cn("absolute left-0 top-0 h-full w-1.5 rounded-l-2xl", accent)} />
      <h4 className="font-semibold">{task.title}</h4>
      <p className="mt-1 text-sm text-muted-foreground">{task.description || "Sin descripción."}</p>

      <div className="mt-3 flex flex-wrap items-center gap-3 text-xs">
        <div className="inline-flex items-center gap-1">
          <span className="text-muted-foreground">Prioridad:</span> <PriorityChip priority={task.priority as any} />
        </div>
        <div className="inline-flex items-center gap-1">
          <span className="text-muted-foreground">Estado:</span> <StatusBadge status={task.status} />
        </div>
        {due && (
          <div className="inline-flex items-center gap-1">
            <Calendar className="h-3.5 w-3.5 text-muted-foreground" />
            <span className="text-muted-foreground">Vence:</span>
            <span>{due}</span>
          </div>
        )}
      </div>

      {subtasks.length > 0 && (
        <div className="mt-4">
          <div className="mb-2 flex items-center justify-between">
            <h5 className="text-xs font-semibold">Subtareas</h5>
            <span className="text-xs text-muted-foreground">
              {done} de {subtasks.length}
            </span>
          </div>
          <div className="h-1.5 w-full overflow-hidden rounded-full ring-1 ring-neutral-300/70 dark:ring-white/10">
            <div
              className={cn(
                "h-full rounded-full transition-[width]",
                pct === 100 ? "bg-emerald-500" : "bg-gradient-to-r from-indigo-500 via-violet-500 to-fuchsia-500"
              )}
              style={{ width: `${pct}%` }}
            />
          </div>

          <ul className="mt-3 space-y-1.5">
            {subtasks.map((sub: Subtask) => (
              <li key={sub.id} className="flex items-center text-sm">
                {sub.completed ? (
                  <CheckSquare className="mr-2 h-4 w-4 text-emerald-500" />
                ) : (
                  <Square className="mr-2 h-4 w-4 text-muted-foreground" />
                )}
                <span className={cn(sub.completed && "line-through text-muted-foreground")}>{sub.title}</span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </article>
  );
};

// --- Props ---

interface MemberDashboardProps {
  userName: string | null;
  memberData: UserDashboardData | null;
}

// --- Componente Principal ---

export function MemberDashboard({ userName, memberData }: MemberDashboardProps) {
  // Skeleton
  if (!memberData) {
    return (
      <div className="grid min-h-[50vh] place-items-center">
        <div className="text-center">
          <Loader2 className="mx-auto mb-3 h-8 w-8 animate-spin text-primary" />
          <h1 className="text-xl font-semibold">Cargando dashboard...</h1>
          <p className="text-sm text-muted-foreground">Un momento, por favor.</p>
        </div>
      </div>
    );
  }

  const { user, teams, assignedTasks, activityLogs } = memberData;

  const { total, todo, inProgress, done } = useMemo(() => {
    let t = 0,
      td = 0,
      ip = 0,
      dn = 0;
    for (const task of assignedTasks) {
      t++;
      if (task.status === "todo") td++;
      else if (task.status === "in-progress") ip++;
      else if (task.status === "done") dn++;
    }
    return { total: t, todo: td, inProgress: ip, done: dn };
  }, [assignedTasks]);

  // Ordena tareas por fecha de vencimiento ascendente
  const tasksSorted = useMemo(() => {
    return [...assignedTasks].sort((a, b) => {
      const ad = toDateSafe(a.dueDate)?.getTime() ?? Number.POSITIVE_INFINITY;
      const bd = toDateSafe(b.dueDate)?.getTime() ?? Number.POSITIVE_INFINITY;
      return ad - bd;
    });
  }, [assignedTasks]);

  return (
    <div className="w-full px-4 py-6 sm:px-6 lg:px-8 2xl:px-12">
      <header className="mb-8">
        <h1 className="text-3xl font-bold">Hola {user.displayName || userName || "usuario"} 👋</h1>
        <p className="text-sm text-muted-foreground">Este es tu resumen general.</p>
      </header>

      {/* Estadísticas */}
      <section className="mb-8 grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
        <StatCard title="Tareas totales" value={total} Icon={ListChecks} />
        <StatCard title="Pendientes" value={todo} Icon={Clock} gradient="from-amber-500 via-orange-500 to-rose-500" />
        <StatCard title="En progreso" value={inProgress} Icon={ActivityIcon} gradient="from-sky-500 via-indigo-500 to-violet-500" />
        <StatCard title="Completadas" value={done} Icon={CheckCircle2} gradient="from-emerald-500 via-teal-500 to-cyan-500" />
      </section>

      <main className="grid grid-cols-1 gap-8 lg:grid-cols-3">
        {/* Tareas */}
        <section className="lg:col-span-2">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-xl font-semibold">Mis tareas asignadas</h2>
            <span className="text-xs text-muted-foreground">{total}</span>
          </div>

          {tasksSorted.length > 0 ? (
            <div className="grid grid-cols-1 gap-4">
              {tasksSorted.map((task) => (
                <TaskCard key={task.id} task={task} />
              ))}
            </div>
          ) : (
            <div className="rounded-2xl p-8 text-center ring-2 ring-neutral-300/90 dark:ring-white/20">
              <CheckCircle2 className="mx-auto mb-3 h-10 w-10 text-emerald-500" />
              <h3 className="text-lg font-semibold">¡Sin tareas asignadas!</h3>
              <p className="text-sm text-muted-foreground">Disfruta tu día.</p>
            </div>
          )}
        </section>

        {/* Lateral */}
        <aside className="space-y-6">
          <div className="rounded-2xl p-4 ring-2 ring-neutral-300/90 dark:ring-white/20">
            <h3 className="mb-3 flex items-center gap-2 text-base font-semibold">
              <Users className="h-5 w-5 text-primary" /> Mi equipo
            </h3>
            {teams.length > 0 ? (
              <ul className="divide-y divide-neutral-200/60 dark:divide-white/10">
                {teams.map((team) => (
                  <li key={team.id} className="py-2 text-sm">
                    {team.teamName}
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-sm text-muted-foreground">Aún no eres miembro de ningún equipo.</p>
            )}
          </div>

          <div className="rounded-2xl p-4 ring-2 ring-neutral-300/90 dark:ring-white/20">
            <h3 className="mb-3 flex items-center gap-2 text-base font-semibold">
              <History className="h-5 w-5 text-primary" /> Actividad reciente
            </h3>
            {activityLogs.length > 0 ? (
              <ul className="divide-y divide-neutral-200/60 dark:divide-white/10">
                {activityLogs.slice(0, 6).map((log) => (
                  <li key={log.id} className="py-2">
                    <p className="text-sm capitalize">{String(log.action || "").replace(/_/g, " ")}</p>
                    <p className="mt-1 text-xs text-muted-foreground">{formatDate(log.createdAt)}</p>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-sm text-muted-foreground">No hay actividad reciente para mostrar.</p>
            )}
          </div>
        </aside>
      </main>
    </div>
  );
}