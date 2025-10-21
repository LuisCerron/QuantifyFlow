import { Draggable } from 'react-beautiful-dnd';
import type { TaskWithDetails } from '@/types';
import { useMemo, useState } from 'react';
import { Timestamp } from 'firebase/firestore';
import { updateSubtaskStatus } from '@/services/kanbanService';

interface TaskCardProps {
  task: TaskWithDetails;
  index: number;
  onClick: () => void;
  onUpdate: () => void;
}

const getDueDateStatus = (dueDate?: Date | Timestamp): 'overdue' | 'due-soon' | 'normal' => {
  if (!dueDate) return 'normal';
    let jsDate: Date;
    if ('toDate' in dueDate) {
        jsDate = dueDate.toDate();
    } else {
        jsDate = dueDate;
    }
    const now = new Date();
    const diffHours = (jsDate.getTime() - now.getTime()) / (1000 * 60 * 60);
    if (diffHours < 0) return 'overdue';
    if (diffHours <= 24) return 'due-soon';
    return 'normal';
};

export default function TaskCard({ task, index, onClick,onUpdate }: TaskCardProps) {
  const [updatingSubtaskId, setUpdatingSubtaskId] = useState<string | null>(null);

  const dueDateStatus = useMemo(() => getDueDateStatus(task.dueDate), [task.dueDate]);
  const completedSubtasks = task.subtasks.filter(st => st.completed).length;

  const borderColorClass = {
    'overdue': 'border-l-4 border-red-500',
    'due-soon': 'border-l-4 border-amber-500',
    'normal': 'border-l-4 border-transparent'
  }[dueDateStatus];

  // --- NUEVO MANEJADOR PARA EL CHECKBOX ---
  const handleSubtaskToggle = async (e: React.MouseEvent, subtaskId: string, currentStatus: boolean) => {
    // Evita que el click en el checkbox abra el modal de la tarea
    e.stopPropagation(); 
    
    setUpdatingSubtaskId(subtaskId);
    try {
      await updateSubtaskStatus(task.id, subtaskId, !currentStatus);
      onUpdate(); // Llama a la función para refrescar el tablero
    } catch (error) {
      console.error("Fallo al cambiar estado de la subtarea:", error);
      // Opcional: mostrar un toast de error al usuario
    } finally {
      setUpdatingSubtaskId(null);
    }
  };
  return (
    <Draggable draggableId={task.id} index={index}>
      {(provided) => (
        <div
          ref={provided.innerRef}
          {...provided.draggableProps}
          {...provided.dragHandleProps}
          onClick={onClick}
          className={`bg-white dark:bg-gray-700 p-4 mb-4 rounded-lg shadow cursor-pointer hover:shadow-md border-2 ${borderColorClass}`}
        >
          <h3 className="font-semibold text-gray-900 dark:text-gray-100">{task.title}</h3>

          {/* --- NUEVA LISTA DE SUBTAREAS --- */}
          {task.subtasks.length > 0 && (
            <div className="space-y-2 mb-3">
                <p className="text-xs font-semibold text-gray-500 dark:text-gray-400">
                    {completedSubtasks} de {task.subtasks.length} completadas
                </p>
                <div className="space-y-1">
                    {task.subtasks.map(subtask => (
                        <div
                            key={subtask.id}
                            // El onClick en el div da un área de click más grande
                            onClick={(e) => handleSubtaskToggle(e, subtask.id, subtask.completed)}
                            className="flex items-center gap-2 p-1 rounded-md hover:bg-gray-100 dark:hover:bg-gray-600 cursor-pointer"
                        >
                            <input
                                type="checkbox"
                                checked={subtask.completed}
                                readOnly // El div se encarga de la lógica
                                disabled={updatingSubtaskId === subtask.id}
                                className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500 disabled:opacity-50"
                            />
                            <span className={`text-sm select-none ${subtask.completed ? 'line-through text-gray-400' : 'text-gray-800 dark:text-gray-200'}`}>
                                {subtask.title}
                            </span>
                        </div>
                    ))}
                </div>
            </div>
          )}
          {/* Tags */}
          <div className="flex flex-wrap gap-2 mt-3">
            {task.tags.map(tag => (
              <span key={tag.id} className="text-xs px-2 py-1 rounded-full" style={{ backgroundColor: tag.color, color: '#fff' }}>
                {tag.tagName}
              </span>
            ))}
          </div>

          {/* Assigned User */}
          {task.assignedTo && (
            <div className="mt-4 flex items-center">
              <img
                src={task.assignedTo.photoURL || 'https://placehold.co/32x32'}
                alt={task.assignedTo.displayName}
                className="w-8 h-8 rounded-full"
              />
              <span className="ml-2 text-sm text-gray-600 dark:text-gray-300">{task.assignedTo.displayName}</span>
            </div>
          )}
        </div>
      )}
    </Draggable>
  );
}