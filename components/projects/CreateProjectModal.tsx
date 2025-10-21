// components/projects/CreateProjectModal.tsx
"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogOverlay, // ✨ 1. Importar DialogOverlay y DialogPortal
  DialogPortal,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { createProject } from "@/services/projectService";
import { toast } from "sonner";

interface CreateProjectModalProps {
  children: React.ReactNode;
  teamId?: string;
  onProjectCreated: () => void;
}

export function CreateProjectModal({ children, teamId, onProjectCreated }: CreateProjectModalProps) {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!teamId || !name) return;

    setIsLoading(true);
    const toastId = toast.loading("Creando proyecto...");

    try {
      await createProject({ teamId, name, description });
      toast.success("Proyecto creado exitosamente.", { id: toastId });
      onProjectCreated();
      setOpen(false);
    } catch (error) {
      toast.error("Error al crear el proyecto.", { id: toastId });
      console.error(error);
    } finally {
      setIsLoading(false);
    }
  };
  
  const handleOpenChange = (isOpen: boolean) => {
    setOpen(isOpen);
    if (!isOpen) {
      setName('');
      setDescription('');
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>{children}</DialogTrigger>
      {/* ✨ 2. Usar DialogPortal para renderizar el modal en la raíz del body */}
      <DialogPortal>
        {/* ✨ 3. Añadir el overlay con el efecto de desenfoque */}
        <DialogOverlay className="bg-background/80 backdrop-blur-sm" />
        {/* ✨ 4. Añadir z-50 para asegurar que el contenido esté por encima del overlay */}
        <DialogContent className="sm:max-w-[425px] z-50"> 
          <form onSubmit={handleSubmit}>
            <DialogHeader>
              <DialogTitle>Crear Nuevo Proyecto</DialogTitle>
              <DialogDescription>
                Dale un nombre y una descripción a tu nuevo proyecto.
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="name">Nombre del Proyecto</Label>
                <Input 
                  id="name" 
                  value={name} 
                  onChange={(e) => setName(e.target.value)} 
                  required 
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="description">Descripción (Opcional)</Label>
                <Textarea
                  id="description"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Describe brevemente de qué trata este proyecto..."
                />
              </div>
            </div>
            <DialogFooter>
              <Button type="submit" disabled={isLoading || !name}>
                {isLoading ? "Creando..." : "Crear Proyecto"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </DialogPortal>
    </Dialog>
  );
}