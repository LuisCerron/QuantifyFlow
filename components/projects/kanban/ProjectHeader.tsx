'use client';

import { User, Tag } from '@/types';
import { Search, Plus } from 'lucide-react';

interface ProjectHeaderProps {
  projectName: string;
  teamMembers: User[];
  availableTags: Tag[];
  searchQuery: string;
  onSearchChange: (query: string) => void;
  selectedUsers: string[];
  onUserFilterChange: (userIds: string[]) => void;
  selectedTags: string[];
  onTagFilterChange: (tagIds: string[]) => void;
  onNewTaskClick: () => void;
}

export default function ProjectHeader({
  projectName,
  teamMembers,
  availableTags,
  searchQuery,
  onSearchChange,
  selectedUsers,
  onUserFilterChange,
  selectedTags,
  onTagFilterChange,
  onNewTaskClick,
}: ProjectHeaderProps) {
  // Manejadores para los selectores múltiples
  const handleUserSelect = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const options = Array.from(e.target.selectedOptions, option => option.value);
    onUserFilterChange(options);
  };

  const handleTagSelect = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const options = Array.from(e.target.selectedOptions, option => option.value);
    onTagFilterChange(options);
  };

  return (
    <div className="mb-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <h1 className="text-3xl font-bold text-gray-800 dark:text-white">{projectName}</h1>
        <button
          onClick={onNewTaskClick}
          className="flex items-center gap-2 bg-blue-600 text-white font-semibold py-2 px-4 rounded-lg hover:bg-blue-700 transition-colors"
        >
          <Plus size={20} />
          Añadir Tarea
        </button>
      </div>

      <div className="mt-6 grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Search Bar */}
        <div className="relative md:col-span-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
          <input
            type="text"
            placeholder="Buscar tarea por título..."
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:border-gray-600"
          />
        </div>

        {/* Filtro de Usuario */}
        <div className="md:col-span-1">
          <select
            multiple
            value={selectedUsers}
            onChange={handleUserSelect}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:border-gray-600"
          >
            <option value="" disabled>Filtrar por usuario...</option>
            {teamMembers.map(member => (
              <option key={member.uid} value={member.uid}>{member.displayName}</option>
            ))}
          </select>
        </div>

        {/* Filtro de Etiqueta */}
        <div className="md:col-span-1">
          <select
            multiple
            value={selectedTags}
            onChange={handleTagSelect}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:border-gray-600"
          >
            <option value="" disabled>Filtrar por etiqueta...</option>
            {availableTags.map(tag => (
              // --- AQUÍ ESTÁN LOS CAMBIOS ---
              // CAMBIO 1: Se usa `tagName` en lugar de `name` para mostrar el texto.
              // CAMBIO 2: Se añade un círculo de color para mejorar la visualización.
              <option key={tag.id} value={tag.id} style={{ color: tag.color }}>
                {/* El color solo se aplica bien al texto/carácter, no al fondo o al layout */}
                ● {tag.tagName}
              </option>
            ))}
          </select>
        </div>
      </div>
    </div>
  );
}