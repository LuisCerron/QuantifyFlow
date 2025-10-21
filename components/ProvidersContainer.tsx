// src/components/ProvidersContainer.tsx
"use client";

import React, { useState, useEffect } from 'react';
import { useAuth } from "@/context/AuthContext";
// 👇 Importa tu nuevo y simplificado provider
import { ColorPaletteProvider } from "@/lib/theme-context";
import { Toaster } from "@/components/ui/sonner"; // 'sonner' es el nombre correcto de la librería

export function ProvidersContainer({ children }: { children: React.ReactNode }) {
    const { user } = useAuth();
    const [isMounted, setIsMounted] = useState(false);

    useEffect(() => {
        setIsMounted(true);
    }, []);

    if (!isMounted) {
        // Devolver null sigue siendo una buena estrategia para evitar renderizar
        // componentes dependientes del cliente en el servidor.
        return null;
    }

    return (
        // 👇 Usa el ColorPaletteProvider aquí
        <ColorPaletteProvider userId={user?.uid}>
            {children}
            <Toaster richColors position="top-right" />
        </ColorPaletteProvider>
    );
}