'use client';

import { memo } from 'react';
import { Handle, Position, NodeProps } from '@xyflow/react';
import { TaskWithDetails } from '@/types';

export const TaskNode = memo((props: NodeProps) => {
  const task = props.data as unknown as TaskWithDetails;

  const statusColors: Record<string, string> = {
    todo: 'bg-gray-200 border-gray-400',
    'in-progress': 'bg-blue-100 border-blue-400',
    done: 'bg-green-100 border-green-400',
  };

  const priorityIndicator: Record<string, string> = {
    low: 'border-l-2',
    medium: 'border-l-4',
    high: 'border-l-8',
  };

  return (
    <div className={`rounded-lg border shadow-sm p-3 min-w-[180px] ${statusColors[task.status] || statusColors.todo} ${priorityIndicator[task.priority] || priorityIndicator.low} border-l-gray-500`}>
      <Handle type="target" position={Position.Top} className="!w-3 !h-3" />
      <div className="text-sm font-medium truncate">{task.title}</div>
      <div className="text-xs text-muted-foreground mt-1">
        {task.subtasks?.length > 0 && `${task.subtasks.filter((s: { completed: boolean }) => s.completed).length}/${task.subtasks.length} subtasks`}
      </div>
      <Handle type="source" position={Position.Bottom} className="!w-3 !h-3" />
    </div>
  );
});

TaskNode.displayName = 'TaskNode';
