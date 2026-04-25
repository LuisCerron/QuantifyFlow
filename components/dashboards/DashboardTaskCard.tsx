"use client";

import React, { memo, useMemo, useCallback } from "react";
import { cn } from "@/lib/utils";
import { toDateSafe, formatDateLocale } from "@/lib/utils/date";
import type { TaskWithDetails, Subtask, Project } from "@/types";
import {
  Archive as ArchiveIcon,
  Loader2,
  Square,
  CheckSquare,
  Calendar,
  FolderKanban,
  Lock,
  Link2,
} from "lucide-react";
import { PriorityChip, TaskStatusBadge, TagChip } from "./shared";

const getAccentClass = (status: string): string => {
  if (status === "done") return "bg-emerald-500"
  if (status === "in-progress") return "bg-indigo-500"
  return "bg-violet-500"
}

interface DashboardTaskCardProps {
  task: TaskWithDetails;
  isLight: boolean;
  projects: Project[];
  onSubtaskToggle: (taskId: string, subId: string, newStatus: boolean) => void;
  updatingSubtaskId: string | null;
  onArchiveTask: (taskId: string) => void;
  archivingTaskId: string | null;
  dependencySummary?: {
    blockedBy: number;
    blocking: number;
    related: number;
    isBlocked: boolean;
  };
}

const DashboardTaskCard = memo(function DashboardTaskCard({
  task,
  isLight,
  projects,
  onSubtaskToggle,
  updatingSubtaskId,
  onArchiveTask,
  archivingTaskId,
  dependencySummary,
}: DashboardTaskCardProps) {
  const due = useMemo(() => formatDateLocale(task.dueDate), [task.dueDate]);
  const subtasks = useMemo(() => Array.isArray(task.subtasks) ? task.subtasks : [], [task.subtasks]);
  const done = useMemo(() => subtasks.filter((s) => s.completed).length, [subtasks]);
  const pct = useMemo(() => subtasks.length ? Math.round((done / subtasks.length) * 100) : 0, [subtasks.length, done]);
  const isArchiving = archivingTaskId === task.id;
  const projectName = useMemo(() => 
    projects.find(p => p.id === task.projectId)?.name ?? "Proyecto Desconocido",
    [projects, task.projectId]
  );
  const accent = useMemo(() => getAccentClass(task.status), [task.status]);
  
  const handleToggle = useCallback((sub: Subtask) => {
    onSubtaskToggle(task.id, sub.id, !sub.completed);
  }, [task.id, onSubtaskToggle]);
  
  const handleArchive = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    onArchiveTask(task.id);
  }, [task.id, onArchiveTask]);

  if (isLight) {
    return (
      <article className="relative rounded-2xl border-2 border-black p-2">
        {task.status === 'done' && (
          <button
            onClick={handleArchive}
            disabled={isArchiving}
            aria-label="Archivar tarea"
            title="Archivar tarea"
            className={cn(
              "absolute top-2 right-2 p-1 rounded-md text-black/50 hover:text-black hover:bg-black/10 transition-colors disabled:opacity-50 disabled:cursor-not-allowed",
              isArchiving && "animate-pulse"
            )}
          >
            {isArchiving ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <ArchiveIcon className="h-4 w-4" />
            )}
          </button>
        )}
        <div className="mb-1 flex items-center gap-1.5 text-xs text-black/60">
          <FolderKanban className="h-3.5 w-3.5 flex-shrink-0" />
          <span className="truncate font-medium">{projectName}</span>
        </div>

        <h4 className="text-lg font-extrabold text-black">{task.title}</h4>
        <p className="mt-1 text-sm text-black/70">{task.description || "Sin descripción."}</p>

        <div className="mt-3 flex flex-wrap items-center gap-3 text-xs">
          <div className="inline-flex items-center gap-2">
            <span className="text-black/70">Prioridad:</span>
            <PriorityChip priority={task.priority as any} isLight />
          </div>
          <div className="inline-flex items-center gap-2">
            <span className="text-black/70">Estado:</span>
            <TaskStatusBadge status={task.status} isLight />
          </div>
          {due && (
            <div className="inline-flex items-center gap-2">
              <Calendar className="h-3.5 w-3.5 text-black" />
              <span className="text-black/70">Vence:</span>
              <span className="font-semibold text-black">{due}</span>
            </div>
          )}
          {task.tags && task.tags.length > 0 && (
            <div className="inline-flex items-center gap-2">
              <span className="text-black/70">Tags:</span>
              {task.tags.map((tag) => (
                <TagChip key={tag.id} tag={tag} isLight />
              ))}
            </div>
          )}
          {dependencySummary && (
            <div className="inline-flex items-center gap-1.5">
              {dependencySummary.isBlocked && (
                <span className="inline-flex items-center gap-1 rounded-full border border-red-200 bg-red-100 px-2 py-0.5 text-xs font-medium text-red-700">
                  <Lock className="h-3 w-3" />
                  {dependencySummary.blockedBy}
                </span>
              )}
              {dependencySummary.blocking > 0 && !dependencySummary.isBlocked && (
                <span className="inline-flex items-center gap-1 rounded-full border border-blue-200 bg-blue-100 px-2 py-0.5 text-xs font-medium text-blue-700">
                  <Link2 className="h-3 w-3" />
                  {dependencySummary.blocking}
                </span>
              )}
              {dependencySummary.related > 0 && (
                <span className="inline-flex items-center gap-1 rounded-full border border-green-200 bg-green-100 px-2 py-0.5 text-xs font-medium text-green-700">
                  <Link2 className="h-3 w-3" />
                  {dependencySummary.related}
                </span>
              )}
            </div>
          )}
        </div>

        {subtasks.length > 0 && (
          <div className="mt-4">
            <div className="mb-2 flex items-center justify-between">
              <h5 className="text-xs font-extrabold text-black uppercase tracking-wide">Subtareas</h5>
              <span className="text-xs text-black/70">
                {done} de {subtasks.length}
              </span>
            </div>
            <div className="h-2 w-full overflow-hidden rounded-full border-2 border-black">
              <div className="h-full bg-black transition-[width]" style={{ width: `${pct}%` }} />
            </div>

            <ul className="mt-3 space-y-1.5">
              {subtasks.map((sub: Subtask) => (
                <li
                  key={sub.id}
                  onClick={() => handleToggle(sub)}
                  className={cn(
                    "flex items-center text-sm text-black",
                    updatingSubtaskId ? "cursor-wait opacity-50" : "cursor-pointer"
                  )}
                >
                  {updatingSubtaskId === sub.id ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin text-black" />
                  ) : sub.completed ? (
                    <CheckSquare className="mr-2 h-4 w-4 text-black" />
                  ) : (
                    <Square className="mr-2 h-4 w-4 text-black/60" />
                  )}
                  <span className={cn(sub.completed && "line-through text-black/60")}>{sub.title}</span>
                </li>
              ))}
            </ul>
          </div>
        )}
      </article>
    );
  }

  return (
    <article className={cn("relative rounded-2xl p-4 transition-all", "ring-2 ring-neutral-300/90 hover:ring-violet-500/60 dark:ring-white/20")}>
      {task.status === 'done' && (
        <button
          onClick={handleArchive}
          disabled={isArchiving}
          aria-label="Archivar tarea"
          title="Archivar tarea"
          className={cn(
            "absolute top-2 right-2 p-1 rounded-md text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed",
            isArchiving && "animate-pulse"
          )}
        >
          {isArchiving ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <ArchiveIcon className="h-4 w-4" />
          )}
        </button>
      )}

      <span className={cn("absolute left-0 top-0 h-full w-1.5 rounded-l-2xl", accent)} />
      <div className="mb-1 flex items-center gap-1.5 text-xs text-muted-foreground">
        <FolderKanban className="h-3.5 w-3.5 flex-shrink-0" />
        <span className="truncate font-medium">{projectName}</span>
      </div>
      <h4 className="font-semibold">{task.title}</h4>
      <p className="mt-1 text-sm text-muted-foreground">{task.description || "Sin descripción."}</p>

      <div className="mt-3 flex flex-wrap items-center gap-3 text-xs">
        <div className="inline-flex items-center gap-1">
          <span className="text-muted-foreground">Prioridad:</span>{" "}
          <PriorityChip priority={task.priority as any} isLight={false} />
        </div>
        <div className="inline-flex items-center gap-1">
          <span className="text-muted-foreground">Estado:</span>{" "}
          <TaskStatusBadge status={task.status} isLight={false} />
        </div>
        {due && (
          <div className="inline-flex items-center gap-1">
            <Calendar className="h-3.5 w-3.5 text-muted-foreground" />
            <span className="text-muted-foreground">Vence:</span>
            <span>{due}</span>
          </div>
        )}
        {task.tags && task.tags.length > 0 && (
          <div className="inline-flex items-center gap-1.5">
            <span className="text-muted-foreground">Tags:</span>
            {task.tags.map((tag) => (
              <TagChip key={tag.id} tag={tag} isLight={false} />
            ))}
          </div>
        )}
        {dependencySummary && (
          <div className="inline-flex items-center gap-1.5">
            {dependencySummary.isBlocked && (
              <span className="inline-flex items-center gap-1 rounded-full border border-red-200 bg-red-100 px-2 py-0.5 text-xs font-medium text-red-700 dark:border-red-800 dark:bg-red-900/30 dark:text-red-300">
                <Lock className="h-3 w-3" />
                {dependencySummary.blockedBy}
              </span>
            )}
            {dependencySummary.blocking > 0 && !dependencySummary.isBlocked && (
              <span className="inline-flex items-center gap-1 rounded-full border border-blue-200 bg-blue-100 px-2 py-0.5 text-xs font-medium text-blue-700 dark:border-blue-800 dark:bg-blue-900/30 dark:text-blue-300">
                <Link2 className="h-3 w-3" />
                {dependencySummary.blocking}
              </span>
            )}
            {dependencySummary.related > 0 && (
              <span className="inline-flex items-center gap-1 rounded-full border border-green-200 bg-green-100 px-2 py-0.5 text-xs font-medium text-green-700 dark:border-green-800 dark:bg-green-900/30 dark:text-green-300">
                <Link2 className="h-3 w-3" />
                {dependencySummary.related}
              </span>
            )}
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
              <li
                key={sub.id}
                onClick={() => handleToggle(sub)}
                className={cn(
                  "flex items-center text-sm",
                  updatingSubtaskId ? "cursor-wait opacity-50" : "cursor-pointer"
                )}
              >
                {updatingSubtaskId === sub.id ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin text-primary" />
                ) : sub.completed ? (
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
});

export default DashboardTaskCard