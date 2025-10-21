"use client";

import React, { useEffect, useMemo, useState } from "react";
import { useAuth } from "@/context/AuthContext";
import { useProjects } from "@/hooks/useProjects";
import { useCurrentTeam } from "@/hooks/useCurrentTeam";
import { ProjectCard } from "@/components/projects/ProjectCard";
import { CreateProjectModal } from "@/components/projects/CreateProjectModal";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { PlusCircle, Search } from "lucide-react";

// Skeleton sin marcos (vidrio sutil)
const SkeletonLoader = () => (
  <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
    {Array.from({ length: 6 }).map((_, i) => (
      <div
        key={i}
        className="relative overflow-hidden rounded-2xl bg-card/60 p-5 shadow-[0_8px_30px_-20px_rgba(0,0,0,0.6)] backdrop-blur supports-[backdrop-filter]:backdrop-blur-xl"
      >
        <div className="h-6 w-3/4 animate-pulse rounded-md bg-muted/60" />
        <div className="mt-3 h-4 w-full animate-pulse rounded-md bg-muted/50" />
        <div className="mt-2 h-4 w-1/2 animate-pulse rounded-md bg-muted/50" />
        <div className="mt-6 flex justify-end">
          <div className="h-5 w-24 animate-pulse rounded-md bg-muted/60" />
        </div>
      </div>
    ))}
  </div>
);

export default function ProjectsPage() {
  const { user } = useAuth();
  const { currentTeam, userRole, isLoading: isLoadingTeam } = useCurrentTeam(user?.uid);
  const { projects, isLoading: isLoadingProjects, error, refreshProjects, setSearchTerm } = useProjects(
    currentTeam?.teamId
  );

  const isAdmin = userRole === "admin";
  const isLoading = isLoadingTeam || isLoadingProjects;

  // Búsqueda con debounce
  const [query, setQuery] = useState("");
  useEffect(() => {
    const id = setTimeout(() => setSearchTerm(query), 250);
    return () => clearTimeout(id);
  }, [query, setSearchTerm]);

  const total = useMemo(() => projects.length, [projects]);

  if (error) {
    return (
      <div className="w-full px-4 sm:px-6 lg:px-8 2xl:px-12 py-10">
        <p className="text-center text-sm font-medium text-destructive">{error}</p>
      </div>
    );
  }

  return (
    // Contenedor fluido, sin "container" ni max-width para evitar márgenes laterales extras
    <div className="w-full px-4 sm:px-6 lg:px-8 2xl:px-12 py-6">
      {/* Header de página */}
      <div className="mb-6 flex flex-col items-start gap-4 md:flex-row md:items-center md:justify-between">
        <div className="space-y-1">
          <h1 className="text-2xl font-bold tracking-tight">
            <span className="bg-gradient-to-r from-indigo-500 via-violet-500 to-fuchsia-500 bg-clip-text text-transparent">
              Proyectos
            </span>
          </h1>
          <p className="text-xs text-muted-foreground">
            {currentTeam?.teamName ? `Equipo: ${currentTeam.teamName}` : "Equipo no seleccionado"} • {total} resultados
          </p>
        </div>

        <div className="flex w-full flex-col items-stretch gap-2 sm:flex-row sm:items-center sm:justify-end">
          {/* Buscador */}
          <div className="relative w-full sm:w-72 group">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Buscar proyectos..."
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              className="h-11 w-full rounded-2xl bg-background/60 pl-9 focus-visible:ring-2 focus-visible:ring-violet-400/70"
            />
            <div className="pointer-events-none absolute -inset-px rounded-2xl opacity-0 transition-opacity group-focus-within:opacity-100 bg-[conic-gradient(from_180deg_at_50%_50%,rgba(124,58,237,0.25),rgba(34,211,238,0.25),rgba(251,113,133,0.25),rgba(124,58,237,0.25))]" />
          </div>

          {isAdmin && (
            <CreateProjectModal teamId={currentTeam?.teamId} onProjectCreated={refreshProjects}>
              <Button className="relative h-11 rounded-2xl font-semibold shadow-md bg-gradient-to-r from-indigo-500 via-violet-500 to-fuchsia-500 hover:from-indigo-400 hover:via-violet-500 hover:to-fuchsia-400">
                <PlusCircle className="mr-2 h-4 w-4" />
                Nuevo proyecto
              </Button>
            </CreateProjectModal>
          )}
        </div>
      </div>

      {/* Contenido */}
      {isLoading ? (
        <SkeletonLoader />
      ) : projects.length === 0 ? (
        <div className="relative overflow-hidden rounded-2xl bg-card/60 p-10 text-center shadow-[0_8px_30px_-20px_rgba(0,0,0,0.6)] backdrop-blur supports-[backdrop-filter]:backdrop-blur-xl">
          <div className="absolute inset-0 opacity-20 blur-2xl bg-gradient-to-r from-indigo-500 via-violet-500 to-fuchsia-500" />
          <div className="relative z-10">
            <h2 className="text-xl font-semibold">No se encontraron proyectos</h2>
            <p className="mt-2 text-sm text-muted-foreground">
              Ajusta tu búsqueda o crea un nuevo proyecto si tienes permisos.
            </p>
            {isAdmin && (
              <div className="mt-6 inline-block">
                <CreateProjectModal teamId={currentTeam?.teamId} onProjectCreated={refreshProjects}>
                  <Button className="rounded-2xl">
                    <PlusCircle className="mr-2 h-4 w-4" />
                    Crear proyecto
                  </Button>
                </CreateProjectModal>
              </div>
            )}
          </div>
        </div>
      ) : (
        <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
          {projects.map((project) => (
            <ProjectCard key={project.id} project={project} />
          ))}
        </div>
      )}
    </div>
  );
}