// KanbanColumn.tsx

// Importa tu nuevo componente en lugar del original
// import { Droppable } from 'react-beautiful-dnd'; 
import { StrictModeDroppable } from './StrictModeDroppable'; // Ajusta la ruta si es necesario
import TaskCard from './TaskCard';
import type { TaskWithDetails } from '@/types';

interface KanbanColumnProps {
  column: {
    id: string;
    title: string;
    tasks: TaskWithDetails[];
  };
  onTaskClick: (task: TaskWithDetails) => void;
  onRefreshBoard: () => void;
}

export default function KanbanColumn({ column, onTaskClick, onRefreshBoard }: KanbanColumnProps) {
  return (
    <div className="bg-gray-100 dark:bg-gray-800 rounded-lg p-4 flex flex-col">
      <h2 className="text-lg font-bold mb-4 px-2">{column.title} ({column.tasks.length})</h2>
      
      {/* Usa el nuevo componente aquí */}
      <StrictModeDroppable droppableId={column.id}>
        {(provided, snapshot) => (
          <div
            ref={provided.innerRef}
            {...provided.droppableProps}
            className={`flex-grow min-h-[400px] transition-colors duration-200 ${
              snapshot.isDraggingOver ? 'bg-blue-50 dark:bg-gray-700' : ''
            }`}
          >
            {column.tasks.map((task, index) => (
              <TaskCard key={task.id} task={task} index={index} onClick={() => onTaskClick(task)}  onUpdate={onRefreshBoard}/>
            ))}
            {provided.placeholder}
          </div>
        )}
      </StrictModeDroppable>
    </div>
  );
}