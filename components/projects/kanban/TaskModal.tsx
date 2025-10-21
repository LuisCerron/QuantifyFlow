'use client';
import type { Timestamp } from 'firebase/firestore';
import { useState, useEffect } from 'react';
import { User, Tag, TaskWithDetails, Subtask } from '@/types';
import {
    createTask,
    updateTask,
    deleteTask,
    setTaskTags,
    addSubtask as apiAddSubtask,
    removeSubtask as apiRemoveSubtask,
    updateSubtaskTitle, // Importa la nueva función
} from '@/services/kanbanService';
import { X, Plus, Trash2 } from 'lucide-react';

// --- Interfaces y Props sin cambios ---
interface TaskModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSave: () => void;
    taskToEdit?: TaskWithDetails | null;
    projectId: string;
    teamId: string;
    userId: string;
    userRole: 'admin' | 'member' | null;
    teamMembers: User[];
    availableTags: Tag[];
}

export default function TaskModal({
    isOpen,
    onClose,
    onSave,
    taskToEdit,
    projectId,
    teamId,
    userId,
    userRole,
    teamMembers,
    availableTags,
}: TaskModalProps) {
    // --- Estados del formulario ---
    const [title, setTitle] = useState('');
    const [description, setDescription] = useState('');
    const [assignedToId, setAssignedToId] = useState<string | undefined>(undefined);
    const [priority, setPriority] = useState<'low' | 'medium' | 'high'>('medium');
    const [dueDate, setDueDate] = useState('');
    const [tagIds, setTagIds] = useState<string[]>([]);
    const [subtasks, setSubtasks] = useState<Partial<Subtask>[]>([]);

    // --- Estados para la lógica del componente ---
    const [originalSubtasks, setOriginalSubtasks] = useState<Subtask[]>([]);
    const [originalTagIds, setOriginalTagIds] = useState<string[]>([]);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const isEditMode = !!taskToEdit;

    // --- Efecto para poblar o resetear el formulario ---
    useEffect(() => {
        if (isOpen && taskToEdit) {
            console.log("MODAL: Abierto en modo edición para la tarea:", taskToEdit.id);
            setTitle(taskToEdit.title);
            setDescription(taskToEdit.description || '');
            setAssignedToId(taskToEdit.assignedToId);
            setPriority(taskToEdit.priority);


            const dueDateFromDb = taskToEdit.dueDate;
            let jsDate: Date | null = null;

            if (dueDateFromDb && 'toDate' in dueDateFromDb) {
                // Caso 1: Es un Timestamp de Firestore.
                // Le decimos a TypeScript que confíe en que es un Timestamp.
                jsDate = (dueDateFromDb as Timestamp).toDate();
            } else if (dueDateFromDb instanceof Date) {
                // Caso 2: Ya es un objeto Date de JavaScript.
                jsDate = dueDateFromDb;
            }

            // Finalmente, establece el estado usando el objeto Date válido
            setDueDate(jsDate ? jsDate.toISOString().substring(0, 10) : '');

            const initialTagIds = taskToEdit.tags.map(t => t.id);
            setTagIds(initialTagIds);
            setOriginalTagIds(initialTagIds); // Guardar estado original

            const initialSubtasks = taskToEdit.subtasks;
            setSubtasks(initialSubtasks);
            setOriginalSubtasks(initialSubtasks); // Guardar estado original
        } else if (isOpen) {
            console.log("MODAL: Abierto en modo creación.");
            // Resetear el formulario para una nueva tarea
            setTitle('');
            setDescription('');
            setAssignedToId(undefined);
            setPriority('medium');
            setDueDate('');
            setTagIds([]);
            setOriginalTagIds([]);
            setSubtasks([]);
            setOriginalSubtasks([]);
            setError(null);
        }
    }, [isOpen, taskToEdit]);

    // --- Manejadores de estado local para subtareas ---
    const handleSubtaskChange = (index: number, newTitle: string) => {
        const updatedSubtasks = [...subtasks];
        updatedSubtasks[index].title = newTitle;
        setSubtasks(updatedSubtasks);
    };

    const handleAddSubtaskLocal = () => {
        setSubtasks([...subtasks, { title: '', completed: false }]);
    };

    const handleRemoveSubtaskLocal = (index: number) => {
        setSubtasks(subtasks.filter((_, i) => i !== index));
    };

    // --- Lógica de envío del formulario ---
    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!title.trim()) {
            setError('El título es obligatorio.');
            return;
        }
        setIsSubmitting(true);
        setError(null);
        console.log(`SUBMIT: Iniciando guardado en modo ${isEditMode ? 'EDICIÓN' : 'CREACIÓN'}.`);

        try {
            if (isEditMode && taskToEdit) {
                // --- LÓGICA DE ACTUALIZACIÓN ---
                const updatePromises: Promise<any>[] = [];

                // 1. Actualizar campos principales de la tarea (si han cambiado)
                const coreUpdates: { [key: string]: any } = {};
                if (title !== taskToEdit.title) coreUpdates.title = title;
                if (description !== (taskToEdit.description || '')) coreUpdates.description = description;
                if (assignedToId !== taskToEdit.assignedToId) {
                    coreUpdates.assignedToId = assignedToId || null;
                }
                if (priority !== taskToEdit.priority) coreUpdates.priority = priority;
                let originalDueDateAsDate: Date | undefined;
                if (taskToEdit.dueDate) {
                    if (typeof (taskToEdit.dueDate as any).toDate === 'function') {
                        originalDueDateAsDate = (taskToEdit.dueDate as Timestamp).toDate();
                    } else if (taskToEdit.dueDate instanceof Date) {
                        originalDueDateAsDate = taskToEdit.dueDate;
                    }
                }

                const newDueDate = dueDate ? new Date(dueDate) : undefined;
                // Compara usando el objeto Date que acabamos de crear
                if (newDueDate?.getTime() !== originalDueDateAsDate?.getTime()) {
                    coreUpdates.dueDate = newDueDate || null; // Usa null para borrar la fecha
                }

                if (Object.keys(coreUpdates).length > 0) {
                    console.log("SUBMIT: Actualizando campos principales:", Object.keys(coreUpdates));
                    updatePromises.push(updateTask(taskToEdit.id, coreUpdates, userId, teamId));
                }

                // 2. Actualizar etiquetas (si han cambiado)
                const tagsChanged = JSON.stringify(tagIds.sort()) !== JSON.stringify(originalTagIds.sort());
                if (tagsChanged) {
                    console.log("SUBMIT: Actualizando etiquetas. Nuevas:", tagIds);
                    updatePromises.push(setTaskTags(taskToEdit.id, tagIds, userId, teamId));
                }

                // 3. Procesar subtareas (añadir, eliminar, actualizar)
                const originalSubtaskIds = new Set(originalSubtasks.map(s => s.id));
                const currentSubtaskIds = new Set(subtasks.filter(s => s.id).map(s => s.id));

                // Subtareas a eliminar
                originalSubtasks.forEach(originalSub => {
                    if (!currentSubtaskIds.has(originalSub.id)) {
                        console.log("SUBMIT: Eliminando subtarea:", originalSub.id);
                        updatePromises.push(apiRemoveSubtask(originalSub.id!, taskToEdit.id, userId, teamId));
                    }
                });

                subtasks.forEach(currentSub => {
                    if (currentSub.id) { // Es una subtarea existente
                        if (originalSubtaskIds.has(currentSub.id)) {
                            const originalSub = originalSubtasks.find(s => s.id === currentSub.id);
                            if (originalSub && originalSub.title !== currentSub.title) {
                                console.log("SUBMIT: Actualizando título de subtarea:", currentSub.id);
                                updatePromises.push(updateSubtaskTitle(currentSub.id, currentSub.title!, userId, teamId, taskToEdit.id));
                            }
                        }
                    } else { // Es una subtarea nueva
                        if (currentSub.title?.trim()) {
                            console.log("SUBMIT: Creando nueva subtarea con título:", currentSub.title);
                            updatePromises.push(apiAddSubtask(taskToEdit.id, currentSub.title, userId, teamId));
                        }
                    }
                });

                await Promise.all(updatePromises);
                console.log("SUBMIT: Todas las promesas de actualización completadas.");

            } else {
                // --- LÓGICA DE CREACIÓN ---
                console.log("SUBMIT: Creando nueva tarea...");
                const taskData: any = {
                    projectId,
                    teamId,
                    title,
                    description,
                    priority,
                    createdBy: userId,
                    dueDate: dueDate ? new Date(dueDate) : undefined,
                    tagIds,
                    subtaskTitles: subtasks.map(s => s.title!).filter(t => t.trim() !== ''),
                };
                if (assignedToId) {
                    taskData.assignedToId = assignedToId;
                }
                await createTask(taskData);
            }

            onSave(); // Refrescar el tablero
            onClose(); // Cerrar el modal

        } catch (err) {
            console.error("ERROR: No se pudo guardar la tarea.", err);
            setError('No se pudo guardar la tarea. Inténtalo de nuevo.');
        } finally {
            setIsSubmitting(false);
        }
    };

    // --- Lógica de eliminación ---
    const handleDelete = async () => {
        if (!isEditMode || !taskToEdit || userRole !== 'admin') return;

        if (window.confirm('¿Estás seguro de que quieres eliminar esta tarea? Esta acción no se puede deshacer.')) {
            setIsSubmitting(true);
            setError(null);
            console.log("DELETE: Iniciando eliminación de la tarea:", taskToEdit.id);
            try {
                await deleteTask(taskToEdit.id, userId, teamId);
                console.log("DELETE: Tarea eliminada correctamente.");
                onSave();
                onClose();
            } catch (err) {
                console.error("ERROR: No se pudo eliminar la tarea.", err);
                setError('No se pudo eliminar la tarea.');
                setIsSubmitting(false); // Solo si hay error
            }
        }
    };

    if (!isOpen) return null;

    // --- JSX del componente (sin cambios estructurales mayores) ---
    return (
        <div className="fixed inset-0 bg-black bg-opacity-60 z-50 flex justify-center items-center p-4 backdrop-blur-sm">
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl w-full max-w-2xl max-h-[90vh] flex flex-col">
                {/* -- Encabezado del Modal -- */}
                <div className="flex justify-between items-center p-4 border-b dark:border-gray-700 flex-shrink-0">
                    <h2 className="text-xl font-bold text-gray-900 dark:text-white">
                        {isEditMode ? 'Editar Tarea' : 'Nueva Tarea'}
                    </h2>
                    <button onClick={onClose} className="text-gray-400 hover:text-red-500 transition-colors">
                        <X size={24} />
                    </button>
                </div>

                {/* -- Formulario -- */}
                <form id="task-form" onSubmit={handleSubmit} className="flex-grow overflow-y-auto p-6 space-y-6">
                    {/* Título */}
                    <div>
                        <label htmlFor="title" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Título *</label>
                        <input
                            id="title"
                            type="text"
                            value={title}
                            onChange={e => setTitle(e.target.value)}
                            required
                            className="w-full p-2 border border-gray-300 rounded-md dark:bg-gray-700 dark:border-gray-600 dark:text-white focus:ring-2 focus:ring-blue-500"
                        />
                    </div>

                    {/* Descripción */}
                    <div>
                        <label htmlFor="description" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Descripción</label>
                        <textarea
                            id="description"
                            rows={3}
                            value={description}
                            onChange={e => setDescription(e.target.value)}
                            placeholder="Añade más detalles sobre la tarea..."
                            className="w-full p-2 border border-gray-300 rounded-md dark:bg-gray-700 dark:border-gray-600 dark:text-white focus:ring-2 focus:ring-blue-500"
                        />
                    </div>

                    {/* Grid para Asignado y Prioridad */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        {/* Asignar a */}
                        <div>
                            <label htmlFor="assignedTo" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Asignar a</label>
                            <select
                                id="assignedTo"
                                value={assignedToId || ''}
                                onChange={e => setAssignedToId(e.target.value || undefined)}
                                className="w-full p-2 border border-gray-300 rounded-md dark:bg-gray-700 dark:border-gray-600 dark:text-white focus:ring-2 focus:ring-blue-500"
                            >
                                <option value="">Sin asignar</option>
                                {teamMembers.map(member => (
                                    <option key={member.uid} value={member.uid}>
                                        {member.displayName || member.email}
                                    </option>
                                ))}
                            </select>
                        </div>
                        {/* Prioridad */}
                        <div>
                            <label htmlFor="priority" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Prioridad</label>
                            <select
                                id="priority"
                                value={priority}
                                onChange={e => setPriority(e.target.value as 'low' | 'medium' | 'high')}
                                className="w-full p-2 border border-gray-300 rounded-md dark:bg-gray-700 dark:border-gray-600 dark:text-white focus:ring-2 focus:ring-blue-500"
                            >
                                <option value="low">Baja</option>
                                <option value="medium">Media</option>
                                <option value="high">Alta</option>
                            </select>
                        </div>
                    </div>

                    {/* Grid para Fecha y Etiquetas */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        {/* Fecha de Vencimiento */}
                        <div>
                            <label htmlFor="dueDate" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Fecha de Vencimiento</label>
                            <input
                                id="dueDate"
                                type="date"
                                value={dueDate}
                                onChange={e => setDueDate(e.target.value)}
                                className="w-full p-2 border border-gray-300 rounded-md dark:bg-gray-700 dark:border-gray-600 dark:text-white focus:ring-2 focus:ring-blue-500"
                            />
                        </div>
                        {/* Etiquetas */}
                        <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Etiquetas</label>
                            <div className="flex flex-wrap gap-2 p-2 border border-gray-300 dark:border-gray-600 rounded-md min-h-[42px]">
                                {availableTags.length > 0 ? availableTags.map(tag => (
                                    <button
                                        key={tag.id}
                                        type="button"
                                        onClick={() => {
                                            setTagIds(prev =>
                                                prev.includes(tag.id) ? prev.filter(id => id !== tag.id) : [...prev, tag.id]
                                            );
                                        }}
                                        className={`px-2 py-1 text-xs font-semibold rounded-full transition-all ${tagIds.includes(tag.id)
                                            ? 'text-white'
                                            : 'text-gray-700 dark:text-gray-200'
                                            }`}
                                        style={{
                                            backgroundColor: tagIds.includes(tag.id) ? tag.color : 'transparent',
                                            border: `1px solid ${tag.color}`
                                        }}
                                    >
                                        {tag.tagName}
                                    </button>
                                )) : <span className="text-xs text-gray-500">No hay etiquetas disponibles</span>}
                            </div>
                        </div>
                    </div>

                    {/* Subtareas */}
                    <div>
                        <h3 className="text-lg font-semibold text-gray-800 dark:text-gray-200 mb-2">Subtareas</h3>
                        <div className="space-y-2">
                            {subtasks.map((subtask, index) => (
                                <div key={subtask.id || `new-${index}`} className="flex items-center gap-2">
                                    <input type="checkbox" checked={!!subtask.completed} disabled className="h-5 w-5 rounded cursor-not-allowed" />
                                    <input
                                        type="text"
                                        value={subtask.title || ''}
                                        onChange={e => handleSubtaskChange(index, e.target.value)}
                                        placeholder="Describe la subtarea"
                                        className="flex-grow p-2 border border-gray-300 rounded-md dark:bg-gray-700 dark:border-gray-600 dark:text-white focus:ring-2 focus:ring-blue-500"
                                    />
                                    <button type="button" onClick={() => handleRemoveSubtaskLocal(index)} className="text-gray-500 hover:text-red-500 transition-colors">
                                        <Trash2 size={18} />
                                    </button>
                                </div>
                            ))}
                        </div>
                        <button type="button" onClick={handleAddSubtaskLocal} className="mt-3 flex items-center gap-2 text-sm text-blue-600 hover:text-blue-500 font-medium">
                            <Plus size={16} /> Añadir subtarea
                        </button>
                    </div>

                    {/* Mensaje de Error */}
                    {error && <p className="text-red-500 text-sm font-medium bg-red-100 dark:bg-red-900/30 p-3 rounded-md">{error}</p>}
                </form>

                {/* -- Pie del Modal (Acciones) -- */}
                <div className="flex justify-between items-center gap-4 p-4 border-t dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50 flex-shrink-0">
                    <div>
                        {isEditMode && userRole === 'admin' && (
                            <button type="button" onClick={handleDelete} className="text-red-600 font-semibold hover:underline disabled:opacity-50" disabled={isSubmitting}>
                                Eliminar Tarea
                            </button>
                        )}
                    </div>
                    <div className="flex gap-3">
                        <button type="button" onClick={onClose} className="py-2 px-4 rounded-md border border-gray-300 dark:border-gray-600 font-semibold hover:bg-gray-100 dark:hover:bg-gray-700 disabled:opacity-50" disabled={isSubmitting}>
                            Cancelar
                        </button>
                        {/* Este botón ahora envía el formulario por su atributo 'form' */}
                        <button type="submit" form="task-form" className="bg-blue-600 text-white py-2 px-6 rounded-md font-semibold hover:bg-blue-700 disabled:bg-blue-400 disabled:cursor-wait" disabled={isSubmitting}>
                            {isSubmitting ? 'Guardando...' : (isEditMode ? 'Guardar Cambios' : 'Crear Tarea')}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}