"use client"

import React from "react"
import { AdminDashboardData, TeamMemberWithDetails } from "@/types/dashboard-types"
import { Project, ActivityLog } from "@/types"
import { Timestamp } from "firebase/firestore"
import {
  Users,
  FolderKanban,
  ClipboardList,
  Timer,
  Activity as ActivityIcon,
  CheckCircle2,
  Circle,
  PlayCircle,
  Mail,
  Shield,
} from "lucide-react"

// Utilidades fecha (robusta)
const toDateSafe = (value: unknown): Date | null => {
  if (!value) return null
  if (value instanceof Date) return isNaN(value.getTime()) ? null : value
  if (typeof (value as any)?.toDate === "function") {
    try {
      const d = (value as Timestamp).toDate()
      return isNaN(d.getTime()) ? null : d
    } catch {}
  }
  if (typeof value === "object" && value !== null && "seconds" in (value as any)) {
    const s = Number((value as any).seconds)
    const n = Number((value as any).nanoseconds ?? 0)
    if (!Number.isNaN(s) && !Number.isNaN(n)) {
      const d = new Date(s * 1000 + Math.floor(n / 1e6))
      return isNaN(d.getTime()) ? null : d
    }
  }
  if (typeof value === "string" || typeof value === "number") {
    const d = new Date(value)
    return isNaN(d.getTime()) ? null : d
  }
  return null
}

const formatDate = (dateValue: unknown, locale = "es-ES"): string | null => {
  const d = toDateSafe(dateValue)
  if (!d) return null
  const options: Intl.DateTimeFormatOptions = { day: "2-digit", month: "long", year: "numeric" }
  return d.toLocaleDateString(locale, options)
}

const cx = (...classes: Array<string | false | undefined>) => classes.filter(Boolean).join(" ")

// Subcomponentes
type IconType = React.ComponentType<React.SVGProps<SVGSVGElement>>

const StatCard = ({
  title,
  value,
  Icon,
  gradient = "from-indigo-500 via-violet-500 to-fuchsia-500",
}: {
  title: string
  value: string | number
  Icon: IconType
  gradient?: string
}) => (
  <div className="group relative overflow-hidden rounded-2xl bg-card/60 p-5 shadow-[0_8px_30px_-15px_rgba(0,0,0,0.6)] backdrop-blur supports-[backdrop-filter]:backdrop-blur-xl transition-transform hover:scale-[1.01]">
    <div className={cx("absolute inset-0 opacity-20 blur-2xl bg-gradient-to-r", gradient)} />
    <div className="relative z-10 flex items-center gap-4">
      <div className={cx("rounded-xl p-3 text-white shadow-sm bg-gradient-to-br", gradient)}>
        <Icon className="h-5 w-5" />
      </div>
      <div>
        <p className="text-xs text-muted-foreground">{title}</p>
        <p className="text-2xl font-bold tracking-tight">{value}</p>
      </div>
    </div>
  </div>
)

const StatusBadge = ({ status }: { status?: string }) => {
  const map: Record<string, { label: string; className: string }> = {
    active: { label: "Activo", className: "bg-emerald-400/15 text-emerald-400" },
    paused: { label: "Pausado", className: "bg-amber-400/15 text-amber-400" },
    archived: { label: "Archivado", className: "bg-zinc-400/15 text-zinc-400" },
    default: { label: "Desconocido", className: "bg-muted text-foreground/70" },
  }
  const { label, className } = map[status || ""] || map.default
  return <span className={cx("rounded-full px-2.5 py-1 text-xs font-medium", className)}>{label}</span>
}

const ProjectCard = ({
  project,
  tasks,
}: {
  project: Project
  tasks: Array<{ status?: string; projectId?: string | number }>
}) => {
  const projectId = String((project as any).id ?? (project as any).projectId ?? "")
  const projectTasks = Array.isArray(tasks)
    ? tasks.filter((t) => String(t.projectId ?? "") === projectId)
    : []

  const totals = {
    all: projectTasks.length || (project as any).taskCount || 0,
    todo: projectTasks.filter((t) => t.status === "todo").length,
    progress: projectTasks.filter((t) => t.status === "in-progress").length,
    done: projectTasks.filter((t) => t.status === "done" || t.status === "completed").length,
  }

  const percent = totals.all ? Math.round((totals.done / totals.all) * 100) : 0

  return (
    <div className="group relative overflow-hidden rounded-2xl bg-[linear-gradient(180deg,rgba(255,255,255,0.04),transparent)] p-5 shadow-[0_8px_30px_-20px_rgba(0,0,0,0.6)] transition-transform hover:scale-[1.01]">
      <div className="absolute -right-12 -top-12 h-32 w-32 rounded-full bg-primary/10 blur-3xl transition-transform group-hover:scale-110" />
      <div className="relative z-10 space-y-3">
        <div className="flex items-start justify-between gap-3">
          <h4 className="text-base font-semibold tracking-tight">{project.name}</h4>
          <StatusBadge status={(project as any).status} />
        </div>
        <p className="text-sm text-muted-foreground line-clamp-2">
          {project.description || "Sin descripción."}
        </p>
        <div className="mt-2">
          <div className="mb-1 flex items-center justify-between text-xs text-muted-foreground">
            <span>Progreso</span>
            <span>{percent}%</span>
          </div>
          <div className="h-2 w-full overflow-hidden rounded-full bg-muted/60">
            <div
              className="h-full rounded-full bg-gradient-to-r from-indigo-500 via-violet-500 to-fuchsia-500 transition-[width] duration-700"
              style={{ width: `${percent}%` }}
            />
          </div>
          <div className="mt-2 flex items-center gap-3 text-xs text-muted-foreground">
            <span className="inline-flex items-center gap-1">
              <Circle className="h-3 w-3 text-zinc-400" /> {totals.todo}
            </span>
            <span className="inline-flex items-center gap-1">
              <PlayCircle className="h-3 w-3 text-indigo-400" /> {totals.progress}
            </span>
            <span className="inline-flex items-center gap-1">
              <CheckCircle2 className="h-3 w-3 text-emerald-400" /> {totals.done}
            </span>
          </div>
        </div>
      </div>
    </div>
  )
}

const Avatar = ({ name, src }: { name?: string | null; src?: string | null }) => {
  const initials =
    (name || "")
      .trim()
      .split(" ")
      .map((p) => p[0])
      .slice(0, 2)
      .join("")
      .toUpperCase() || "?"
  return (
    <div className="relative inline-flex h-9 w-9 items-center justify-center overflow-hidden rounded-full bg-muted text-foreground">
      {src ? <img alt={name || "avatar"} src={src} className="h-full w-full object-cover" /> : <span className="text-xs font-semibold">{initials}</span>}
    </div>
  )
}

const MemberListItem = ({ member }: { member: TeamMemberWithDetails }) => (
  <li className="flex items-center justify-between gap-3 rounded-xl px-2 py-2 transition-colors hover:bg-white/5">
    <div className="flex items-center gap-3">
      <Avatar name={member.displayName} src={(member as any).photoURL} />
      <div className="min-w-0">
        <p className="truncate text-sm font-medium">{member.displayName}</p>
        <p className="flex items-center gap-1 truncate text-xs text-muted-foreground">
          <Mail className="h-3.5 w-3.5" />
          {member.email}
        </p>
      </div>
    </div>
    <span className="inline-flex items-center gap-1 rounded-full bg-primary/10 px-2.5 py-1 text-xs font-medium text-primary">
      <Shield className="h-3.5 w-3.5" />
      {(member as any).role || "miembro"}
    </span>
  </li>
)

const ActivityItem = ({ log }: { log: ActivityLog }) => {
  const iconMap: Record<string, IconType> = {
    created_task: ClipboardList,
    updated_task: ActivityIcon,
    moved_task: Timer,
    completed_task: CheckCircle2,
    default: ActivityIcon,
  }
  const label = (log as any).action?.replace(/_/g, " ") ?? "actividad"
  const Icon = iconMap[(log as any).action] || iconMap.default
  const when = formatDate((log as any).createdAt) ?? "—"

  return (
    <li className="flex items-center justify-between gap-3 rounded-xl px-2 py-2 text-sm transition-colors hover:bg-white/5">
      <div className="inline-flex items-center gap-2">
        <Icon className="h-4 w-4 text-primary" />
        <span className="capitalize">{label}</span>
      </div>
      <span className="whitespace-nowrap text-xs text-muted-foreground">{when}</span>
    </li>
  )
}

interface AdminDashboardProps {
  userName: string | null
  adminData: AdminDashboardData | null
}

export function AdminDashboard({ userName, adminData }: AdminDashboardProps) {
  // Skeleton simple sin “tarjeta” contenedora para evitar marcos
  if (!adminData) {
    return (
      <div className="w-full px-4 sm:px-6 lg:px-8 2xl:px-12 py-8">
        <div className="mb-6 h-6 w-64 animate-pulse rounded-lg bg-muted/70" />
        <div className="mb-4 h-4 w-96 animate-pulse rounded-lg bg-muted/60" />
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="h-28 animate-pulse rounded-2xl bg-muted/30" />
          ))}
        </div>
      </div>
    )
  }

  const { team, members, projects, tasks, recentActivity } = adminData
  const tasksToDo = tasks.filter((t: any) => t.status === "todo").length
  const tasksInProgress = tasks.filter((t: any) => t.status === "in-progress").length
  const tasksDone = tasks.filter((t: any) => t.status === "done" || t.status === "completed").length
  const activeProjects = projects.filter((p: any) => p.status === "active").length

  return (
    // Root TRANSPARENTE y sin overlays de fondo para evitar contorno
    <div className="w-full">
      {/* Contenido FLUIDO a todo el ancho del panel derecho */}
      <div className="w-full px-4 sm:px-6 lg:px-8 2xl:px-12 py-8">
        <header className="mb-8">
          <h1 className="text-2xl font-bold tracking-tight">
            Equipo:{" "}
            <span className="bg-gradient-to-r from-indigo-500 via-violet-500 to-fuchsia-500 bg-clip-text text-transparent">
              {team.teamName}
            </span>
          </h1>
          <p className="text-sm text-muted-foreground">Hola {userName ?? "usuario"}, este es el resumen general.</p>
        </header>

        {/* Estadísticas */}
        <section className="mb-10 grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
          <StatCard title="Miembros totales" value={members.length} Icon={Users} gradient="from-sky-500 via-indigo-500 to-violet-500" />
          <StatCard title="Proyectos activos" value={activeProjects} Icon={FolderKanban} gradient="from-emerald-500 via-teal-500 to-cyan-500" />
          <StatCard title="Tareas pendientes" value={tasksToDo} Icon={ClipboardList} gradient="from-amber-500 via-orange-500 to-rose-500" />
          <StatCard title="En progreso" value={tasksInProgress} Icon={Timer} gradient="from-fuchsia-500 via-violet-500 to-indigo-500" />
        </section>

        <main className="grid grid-cols-1 gap-8 lg:grid-cols-3">
          {/* Proyectos */}
          <section className="lg:col-span-2">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-xl font-semibold tracking-tight">Proyectos del equipo</h2>
              <div className="text-xs text-muted-foreground">
                Tareas completadas: <span className="font-semibold text-foreground">{tasksDone}</span>
              </div>
            </div>

            {projects.length > 0 ? (
              <div className="grid grid-cols-1 gap-5 md:grid-cols-2 2xl:grid-cols-3">
                {projects.map((project) => (
                  <ProjectCard key={(project as any).id} project={project} tasks={tasks as any} />
                ))}
              </div>
            ) : (
              <div className="rounded-2xl bg-white/5 p-8 text-center shadow-[0_8px_30px_-20px_rgba(0,0,0,0.6)]">
                <p className="text-sm text-muted-foreground">Aún no se han creado proyectos para este equipo.</p>
              </div>
            )}
          </section>

          {/* Lateral */}
          <aside className="space-y-8">
            <div className="rounded-2xl bg-card/60 p-4 shadow-[0_8px_30px_-20px_rgba(0,0,0,0.6)] backdrop-blur supports-[backdrop-filter]:backdrop-blur-xl">
              <div className="mb-3 flex items-center justify-between">
                <h3 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">Miembros</h3>
                <span className="text-xs text-muted-foreground">{members.length}</span>
              </div>
              <ul className="max-h-[360px] overflow-auto space-y-1 pr-1">
                {members.length > 0 ? (
                  members.map((m) => <MemberListItem key={(m as any).uid} member={m} />)
                ) : (
                  <li className="p-2 text-sm text-muted-foreground">No hay miembros en este equipo.</li>
                )}
              </ul>
            </div>

            <div className="rounded-2xl bg-card/60 p-4 shadow-[0_8px_30px_-20px_rgba(0,0,0,0.6)] backdrop-blur supports-[backdrop-filter]:backdrop-blur-xl">
              <div className="mb-3 flex items-center justify-between">
                <h3 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">Actividad reciente</h3>
                <span className="text-xs text-muted-foreground">{recentActivity.length}</span>
              </div>
              {recentActivity.length > 0 ? (
                <ul className="max-h-[360px] overflow-auto space-y-1 pr-1">
                  {recentActivity.map((log) => (
                    <ActivityItem key={(log as any).id} log={log} />
                  ))}
                </ul>
              ) : (
                <div className="p-2 text-sm text-muted-foreground">No hay actividad reciente para mostrar.</div>
              )}
            </div>
          </aside>
        </main>
      </div>
    </div>
  )
}