"use client";

import React from "react";
import { DragDropContext, DropResult } from "react-beautiful-dnd";
import KanbanColumn from "./KanbanColumn";
import KanbanColumnsWrapper from "./KanbanColumnsWrapper";
import type { TaskWithDetails } from "@/types";

interface KanbanBoardProps {
  columns: Record<string, { id: string; title: string; tasks: TaskWithDetails[] }>;
  onDragEnd: (result: DropResult) => void;
  onTaskClick: (task: TaskWithDetails) => void;
  onSubtaskToggle: (taskId: string, subtaskId: string, newStatus: boolean) => void;
  updatingSubtaskId: string | null;
  userRole: "admin" | "member" | null;
  currentUserId: string;
  dependencyMap?: Map<string, { blockedBy: number; blocking: number; isBlocked: boolean }>;
}

function KanbanBoard({
  columns,
  onDragEnd,
  onTaskClick,
  onSubtaskToggle,
  updatingSubtaskId,
  userRole,
  currentUserId,
  dependencyMap,
}: KanbanBoardProps) {
  return (
    <DragDropContext onDragEnd={onDragEnd}>
      <KanbanColumnsWrapper className="mt-4 pb-6">
        {Object.values(columns).map((column) => (
          <KanbanColumn
            key={column.id}
            column={column}
            onTaskClick={onTaskClick}
            onSubtaskToggle={onSubtaskToggle}
            updatingSubtaskId={updatingSubtaskId}
            userRole={userRole}
            currentUserId={currentUserId}
            dependencyMap={dependencyMap}
          />
        ))}
      </KanbanColumnsWrapper>
    </DragDropContext>
  );
}

export default React.memo(KanbanBoard);