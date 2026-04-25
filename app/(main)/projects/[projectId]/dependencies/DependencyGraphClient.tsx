'use client';

import { useCallback, useState } from 'react';
import {
  ReactFlow,
  Background,
  Controls,
  MiniMap,
  useNodesState,
  useEdgesState,
  Node,
  Edge,
  Panel,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import { TaskWithDetails, DependencyType } from '@/types';
import { TaskNode } from './TaskNode';

const nodeTypes = {
  task: TaskNode,
};

interface Props {
  initialNodes: Array<{ id: string; position: { x: number; y: number }; data: TaskWithDetails }>;
  initialEdges: Array<{ id: string; source: string; target: string; type: DependencyType }>;
  projectId: string;
  teamId: string;
}

const edgeTypeConfig: Record<DependencyType, { color: string; label: string; animated: boolean }> = {
  blocks: { color: '#ef4444', label: 'blocks', animated: true },
  relates_to: { color: '#22c55e', label: 'relates to', animated: false },
  precedes: { color: '#3b82f6', label: 'precedes', animated: false },
  duplicates: { color: '#eab308', label: 'duplicates', animated: false },
};

export default function DependencyGraphClient({ initialNodes, initialEdges, projectId, teamId }: Props) {
  const [nodes, setNodes, onNodesChange] = useNodesState(
    initialNodes.map(n => ({
      id: n.id,
      type: 'task',
      position: n.position,
      data: n.data as unknown as Record<string, unknown>,
    }))
  );

  const [edges, setEdges, onEdgesChange] = useEdgesState(
    initialEdges.map(e => ({
      id: e.id,
      source: e.source,
      target: e.target,
      animated: edgeTypeConfig[e.type].animated,
      style: { stroke: edgeTypeConfig[e.type].color, strokeWidth: 2 },
      label: edgeTypeConfig[e.type].label,
      labelStyle: { fill: edgeTypeConfig[e.type].color, fontWeight: 700 },
    }))
  );

  const [selectedTask, setSelectedTask] = useState<TaskWithDetails | null>(null);

  const onNodeClick = useCallback((_: React.MouseEvent, node: Node) => {
    setSelectedTask(node.data as unknown as TaskWithDetails);
  }, []);

  return (
    <div className="h-[80vh] border rounded-lg">
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onNodeClick={onNodeClick}
        nodeTypes={nodeTypes}
        fitView
        attributionPosition="bottom-left"
      >
        <Background />
        <Controls />
        <MiniMap
          nodeColor={(node) => {
            const task = node.data as unknown as TaskWithDetails;
            if (task.status === 'done') return '#22c55e';
            if (task.status === 'in-progress') return '#3b82f6';
            return '#9ca3af';
          }}
        />
        <Panel position="top-right" className="bg-card p-4 rounded-lg shadow-lg">
          <h3 className="font-semibold mb-2">Legend</h3>
          {Object.entries(edgeTypeConfig).map(([type, config]) => (
            <div key={type} className="flex items-center gap-2 mb-1">
              <div
                className="w-6 h-0.5"
                style={{ backgroundColor: config.color }}
              />
              <span className="text-sm capitalize">{config.label}</span>
            </div>
          ))}
        </Panel>
      </ReactFlow>

      {selectedTask && (
        <TaskDetailPanel
          task={selectedTask}
          onClose={() => setSelectedTask(null)}
          projectId={projectId}
          teamId={teamId}
        />
      )}
    </div>
  );
}

// Simple detail panel
function TaskDetailPanel({ task, onClose, projectId, teamId }: {
  task: TaskWithDetails;
  onClose: () => void;
  projectId: string;
  teamId: string;
}) {
  return (
    <div className="absolute bottom-4 left-4 right-4 bg-card border rounded-lg p-4 shadow-lg z-50">
      <div className="flex justify-between items-start">
        <div>
          <h3 className="font-bold text-lg">{task.title}</h3>
          <p className="text-sm text-muted-foreground">{task.status} • {task.priority}</p>
        </div>
        <button onClick={onClose} className="text-muted-foreground hover:text-foreground">✕</button>
      </div>
      {/* Could open TaskModal here */}
    </div>
  );
}
