"use client";

import React from "react";
import { useTheme } from "next-themes";
import { AdminDashboardData, TeamMemberWithDetails } from "@/types/dashboard-types";
import { Project, ActivityLog } from "@/types";
import {
  Users,
  FolderKanban,
  ClipboardList,
  Timer,
  CheckCircle2,
  Lock,
} from "lucide-react";
import DashboardTaskCard from "./DashboardTaskCard";
import ProjectCard from "../projects/ProjectCard";
import { toDateSafe } from "@/lib/utils/date";
import { cn } from "@/lib/utils";
import { StatCard, MemberListItem, ActivityItem } from "./shared";

interface AdminDashboardProps {
  userName: string | null;
  adminData: AdminDashboardData | null;
  projectsName: Project[];
  isLoadingProjects: boolean;
  onSubtaskToggle: (taskId: string, subId: string, newStatus: boolean) => void;
  updatingSubtaskId: string | null;
  onArchiveTask: (taskId: string) => void;
  archivingTaskId: string | null;
  dependencyMap?: Map<string, { blockedBy: number; blocking: number; related: number; isBlocked: boolean }>;
}

export function AdminDashboard({
  userName,
  adminData,
  onSubtaskToggle,
  updatingSubtaskId,
  onArchiveTask,
  archivingTaskId,
  projectsName,
  isLoadingProjects,
  dependencyMap,
}: AdminDashboardProps) {
  const { resolvedTheme } = useTheme();
  const isLight = resolvedTheme === "light";

  const { team, members, projects, tasks, recentActivity, adminAssignedTasks } = adminData ?? { team: null, members: [], projects: [], tasks: [], recentActivity: [], adminAssignedTasks: [] };
  const tasksToDo = tasks.filter((t: any) => t.status === "todo").length;
  const tasksInProgress = tasks.filter((t: any) => t.status === "in-progress").length;
  const tasksDone = tasks.filter((t: any) => t.status === "done" || t.status === "completed").length;
  const activeProjects = projects.filter((p: any) => p.status === "active").length;
  const blockedTaskCount = adminAssignedTasks.filter((t) => dependencyMap?.get(t.id)?.isBlocked).length;
  
  const adminTasksSorted = React.useMemo(() => {
    return [...adminAssignedTasks].sort((a, b) => {
      const ad = toDateSafe(a.dueDate)?.getTime() ?? Number.POSITIVE_INFINITY;
      const bd = toDateSafe(b.dueDate)?.getTime() ?? Number.POSITIVE_INFINITY;
      if (ad !== bd) return ad - bd;
      return a.title.localeCompare(b.title);
    });
  }, [adminAssignedTasks]);

  if (!adminData) {
    return (
      <div className="w-full px-4 py-8 sm:px-6 lg:px-8 2xl:px-12">
        <div className={cn("mb-6 h-6 w-64 animate-pulse rounded-lg", isLight ? "bg-black/10" : "bg-muted/70")} />
        <div className={cn("mb-4 h-4 w-96 animate-pulse rounded-lg", isLight ? "bg-black/10" : "bg-muted/60")} />
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className={cn("h-28 animate-pulse rounded-2xl", isLight ? "border-2 border-black" : "bg-muted/30")} />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className={cn("w-full", isLight && "bg-white text-black")}>
      <div className="w-full px-4 py-8 sm:px-6 lg:px-8 2xl:px-12">
        <header className="mb-8">
          <h1 className={cn("text-2xl font-extrabold tracking-tight", isLight ? "text-black" : "")}>
            Equipo: <span className={cn(isLight ? "text-black underline decoration-4" : "bg-gradient-to-r from-indigo-500 via-violet-500 to-fuchsia-500 bg-clip-text text-transparent")}>
              {team?.teamName ?? 'Equipo'}
            </span>
          </h1>
          <p className={cn("text-sm", isLight ? "text-black/70" : "text-muted-foreground")}>
            Hola {userName ?? "usuario"}, este es el resumen general.
          </p>
        </header>

        <section className="mb-10 grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
          <StatCard title="Miembros totales" value={members.length} Icon={Users} isLight={isLight} />
          <StatCard title="Proyectos activos" value={activeProjects} Icon={FolderKanban} isLight={isLight} />
          <StatCard title="Tareas pendientes" value={tasksToDo} Icon={ClipboardList} isLight={isLight} />
          <StatCard title="En progreso" value={tasksInProgress} Icon={Timer} isLight={isLight} />
          <StatCard title="Bloqueadas" value={blockedTaskCount} Icon={Lock} isLight={isLight} />
        </section>

        <main className="grid grid-cols-1 gap-8 lg:grid-cols-3">
          <div className="lg:col-span-2 space-y-8">
            <section className="lg:col-span-2">
              <div className="mb-4 flex items-center justify-between">
                <h2 className={cn("text-xl font-extrabold tracking-tight", isLight ? "text-black" : "")}>
                  Proyectos del equipo
                </h2>
                <div className={cn("text-xs", isLight ? "text-black/70" : "text-muted-foreground")}>
                  Tareas completadas: <span className={cn("font-semibold", isLight ? "text-black" : "text-foreground")}>{tasksDone}</span>
                </div>
              </div>

              {projects.length > 0 ? (
                <div className="grid grid-cols-1 gap-5 md:grid-cols-2 2xl:grid-cols-3">
                  {projects.map((project) => (
                    <ProjectCard key={project.id} project={project} />
                  ))}
                </div>
              ) : (
                <div className={cn("p-8 text-center", isLight ? "rounded-2xl border-2 border-black" : "rounded-2xl bg-white/5 shadow-[0_8px_30px_-20px_rgba(0,0,0,0.6)]")}>
                  <p className={cn("text-sm", isLight ? "text-black/70" : "text-muted-foreground")}>
                    Aún no se han creado proyectos para este equipo.
                  </p>
                </div>
              )}
            </section>

            <section>
              <div className="mb-4 flex items-center justify-between">
                <h2 className={cn("text-xl font-extrabold tracking-tight", isLight ? "text-black" : "")}>
                  Mis Tareas Asignadas
                </h2>
                <span className={cn("text-xs", isLight ? "text-black/70" : "text-muted-foreground")}>
                  {adminTasksSorted.length}
                </span>
              </div>

              {adminTasksSorted.length > 0 ? (
                <div className="grid grid-cols-1 gap-4">
                  {adminTasksSorted.map((task) => (
                    <DashboardTaskCard
                      key={task.id}
                      task={task}
                      isLight={isLight}
                      onSubtaskToggle={onSubtaskToggle}
                      updatingSubtaskId={updatingSubtaskId}
                      onArchiveTask={onArchiveTask}
                      archivingTaskId={archivingTaskId}
                      projects={projectsName}
                      dependencySummary={dependencyMap?.get(task.id)}
                    />
                  ))}
                </div>
              ) : (
                <div className={cn("p-8 text-center", isLight ? "rounded-2xl border-2 border-black" : "rounded-2xl bg-white/5")}>
                  <CheckCircle2 className={cn("mx-auto mb-3 h-8 w-8", isLight ? "text-black" : "text-emerald-500")} />
                  <p className={cn("text-sm", isLight ? "text-black/70" : "text-muted-foreground")}>
                    No tienes tareas asignadas actualmente.
                  </p>
                </div>
              )}
            </section>
          </div>

          <aside className="space-y-8">
            <div className={cn("p-4", isLight ? "rounded-2xl border-2 border-black" : "rounded-2xl bg-card/60 shadow-[0_8px_30px_-20px_rgba(0,0,0,0.6)] backdrop-blur supports-[backdrop-filter]:backdrop-blur-xl")}>
              <div className="mb-3 flex items-center justify-between">
                <h3 className={cn("text-sm font-extrabold uppercase tracking-wide", isLight ? "text-black" : "text-muted-foreground")}>
                  Miembros
                </h3>
                <span className={cn("text-xs", isLight ? "text-black/70" : "text-muted-foreground")}>{members.length}</span>
              </div>
              <ul className="max-h-[360px] space-y-2 overflow-auto pr-1">
                {members.length > 0 ? (
                  members.map((m) => <MemberListItem key={(m as any).uid} member={m} isLight={isLight} />)
                ) : (
                  <li className={cn("p-2 text-sm", isLight ? "text-black/70" : "text-muted-foreground")}>No hay miembros en este equipo.</li>
                )}
              </ul>
            </div>

            <div className={cn("p-4", isLight ? "rounded-2xl border-2 border-black" : "rounded-2xl bg-card/60 shadow-[0_8px_30px_-20px_rgba(0,0,0,0.6)] backdrop-blur supports-[backdrop-filter]:backdrop-blur-xl")}>
              <div className="mb-3 flex items-center justify-between">
                <h3 className={cn("text-sm font-extrabold uppercase tracking-wide", isLight ? "text-black" : "text-muted-foreground")}>
                  Actividad reciente
                </h3>
                <span className={cn("text-xs", isLight ? "text-black/70" : "text-muted-foreground")}>{recentActivity.length}</span>
              </div>
              {recentActivity.length > 0 ? (
                <ul className="max-h-[360px] space-y-2 overflow-auto pr-1">
                  {recentActivity.map((log) => (
                    <ActivityItem key={(log as any).id} log={log} isLight={isLight} />
                  ))}
                </ul>
              ) : (
                <div className={cn("p-2 text-sm", isLight ? "text-black/70" : "text-muted-foreground")}>
                  No hay actividad reciente para mostrar.
                </div>
              )}
            </div>
          </aside>
        </main>
      </div>
    </div>
  );
}