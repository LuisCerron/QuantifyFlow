"use client";

import { useAuth } from "@/context/AuthContext";
import { useProjects } from "@/hooks/useProjects";
import { useCurrentTeam } from "@/hooks/useCurrentTeam"; 
import { ProjectCard } from "@/components/projects/ProjectCard";
import { CreateProjectModal } from "@/components/projects/CreateProjectModal";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { PlusCircle, Search } from "lucide-react";

// Componente para el estado de carga
const SkeletonLoader = () => (
  <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
    {Array.from({ length: 3 }).map((_, i) => (
      <div key={i} className="bg-card border rounded-lg p-4 space-y-4 animate-pulse">
        <div className="h-6 bg-muted rounded w-3/4"></div>
        <div className="h-4 bg-muted rounded w-full"></div>
        <div className="h-4 bg-muted rounded w-1/2"></div>
        <div className="pt-4 mt-auto flex justify-end">
           <div className="h-5 bg-muted rounded w-1/4"></div>
        </div>
      </div>
    ))}
  </div>
);


export default function ProjectsPage() {
  const { user } = useAuth();
  const { currentTeam, userRole, isLoading: isLoadingTeam } = useCurrentTeam(user?.uid);
  const { projects, isLoading: isLoadingProjects, error, refreshProjects, setSearchTerm } = useProjects(currentTeam?.teamId);

  const isAdmin = userRole === 'admin';
  const isLoading = isLoadingTeam || isLoadingProjects;

  if (error) {
    return <div className="text-destructive text-center mt-10">{error}</div>;
  }

  return (
    <div className="container mx-auto p-6">
      <div className="flex flex-col md:flex-row justify-between items-center gap-4 mb-6">
        <h1 className="text-3xl font-bold">Proyectos</h1>
        <div className="flex items-center gap-2 w-full md:w-auto">
          <div className="relative w-full md:w-64">
            <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input 
              placeholder="Buscar proyectos..." 
              className="pl-8"
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          {isAdmin && (
            <CreateProjectModal teamId={currentTeam?.teamId} onProjectCreated={refreshProjects}>
              <Button>
                <PlusCircle className="mr-2 h-4 w-4" />
                Nuevo Proyecto
              </Button>
            </CreateProjectModal>
          )}
        </div>
      </div>

      {isLoading ? (
        <SkeletonLoader />
      ) : projects.length === 0 ? (
        <div className="text-center py-12 border-2 border-dashed rounded-lg">
          <h2 className="text-xl font-semibold">No se encontraron proyectos</h2>
          <p className="text-muted-foreground mt-2">
            Intenta ajustar tu búsqueda o crea un nuevo proyecto si eres administrador.
          </p>
        </div>
      ) : (
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {projects.map((project) => (
            <ProjectCard key={project.id} project={project} />
          ))}
        </div>
      )}
    </div>
  );
}

