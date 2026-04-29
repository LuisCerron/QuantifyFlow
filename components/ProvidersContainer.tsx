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

    return (
        <ColorPaletteProvider userId={user?.uid}>
            {children}
            {isMounted && <Toaster richColors position="top-right" />}
        </ColorPaletteProvider>
    );
}