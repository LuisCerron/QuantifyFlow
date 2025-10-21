'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
// 💡 Importamos más iconos para la UI y estados
import {
  ArrowRight,
  Loader2,
  AlertTriangle,
  Check,
  Sun,
  Moon,
} from 'lucide-react';
// 💡 Importamos framer-motion para micro-interacciones
import { motion, AnimatePresence } from 'framer-motion';

import { useAuth } from '@/context/AuthContext';
import {
  useUserSettings,
  UserSettingsData,
  UserProfile,
  Preferences,
} from '@/services/useUserSettings';
import { updateUserProfile } from '@/services/userService';

const themeOptions: Preferences['theme'][] = ['dark', 'light'];
const colorOptions: Preferences['colorPalette'][] = ['default', 'blue', 'green'];

// 💡 Componente de UI reutilizable para el selector de tema (Segmented Control)
const PreferenceButton = ({
  onClick,
  isActive,
  children,
}: {
  onClick: () => void;
  isActive: boolean;
  children: React.ReactNode;
}) => (
  <button
    type="button"
    onClick={onClick}
    className={`relative px-3 py-1.5 text-sm font-medium transition-colors
      ${
        isActive
          ? 'text-primary-foreground'
          : 'text-muted-foreground hover:text-foreground'
      }
    `}
  >
    <span className="relative z-10">{children}</span>
    {isActive && (
      <motion.div
        className="absolute inset-0 bg-primary rounded-md"
        layoutId="active-theme-bg" // 💡 layoutId permite la animación de "deslizamiento"
        transition={{ type: 'spring', stiffness: 300, damping: 30 }}
      />
    )}
  </button>
);

export default function SettingsPage() {
  const { user: authUser } = useAuth();
  const { data, isLoading: isDataLoading } = useUserSettings(authUser?.uid || '');

  const [profileDisplayName, setProfileDisplayName] = useState('');
  const [profilePreferences, setProfilePreferences] =
    useState<Preferences | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (data?.profile) {
      setProfileDisplayName(data.profile.displayName);
      setProfilePreferences(data.profile.preferences);
    }
  }, [data]);

  if (!authUser) {
    return (
      <div className="p-8 text-center text-destructive">
        <AlertTriangle className="mx-auto h-8 w-8 mb-2" />
        No estás autenticado. Por favor, inicia sesión.
      </div>
    );
  }

  // 💡 UX: Reemplazamos el texto plano por un spinner
  if (isDataLoading || !data || !profilePreferences) {
    return (
      <div className="flex h-64 items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const { profile, membership } = data;
  const isTeamAdmin = membership?.role === 'admin';

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    setSaveSuccess(false);
    setError(null);

    try {
      await updateUserProfile(authUser.uid, {
        displayName: profileDisplayName,
        preferences: profilePreferences,
      } as any);

      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3000);
    } catch (err) {
      console.error('Error al guardar el perfil:', err);
      setError('Fallo al guardar los cambios. Inténtalo de nuevo.');
    } finally {
      setIsSaving(false);
    }
  };

  const handlePreferenceChange = (key: keyof Preferences, value: string) => {
    setProfilePreferences(
      (prev) => (prev ? { ...prev, [key]: value as any } : null),
    );
  };

  return (
    // 💡 UI: Padding responsivo y animación de entrada
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className="p-4 md:p-8 max-w-2xl mx-auto"
    >
      <h1 className="text-3xl font-bold mb-6 text-foreground">Configuración</h1>

      {/* 💡 UI: Sección de admin con colores de la paleta (accent) */}
      {isTeamAdmin && membership && (
        <section className="bg-accent border border-primary/20 p-4 rounded-lg shadow-sm mb-6 flex justify-between items-center">
          <div>
            <h2 className="text-lg font-semibold text-accent-foreground">
              Administración de Equipo:{' '}
              <strong>{membership.teamName}</strong>
            </h2>
            <p className="text-sm text-muted-foreground">
              Gestiona el nombre del equipo y las etiquetas.
            </p>
          </div>

          {/* 💡 UX: Animación group-hover en el icono de flecha */}
          <Link
            href="/settings/team"
            className="group inline-flex items-center text-primary hover:text-primary/90 font-medium text-sm transition-colors"
          >
            Ir a Configuración
            <ArrowRight className="w-4 h-4 ml-1 transition-transform group-hover:translate-x-1" />
          </Link>
        </section>
      )}

      <form onSubmit={handleSave} className="space-y-6">
        {/* 💡 UX: Alertas animadas con framer-motion y colores/iconos adecuados */}
        <AnimatePresence>
          {error && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="bg-destructive/10 border border-destructive/20 text-destructive p-3 rounded-md flex items-center space-x-2 text-sm"
            >
              <AlertTriangle className="w-5 h-5 flex-shrink-0" />
              <span>{error}</span>
            </motion.div>
          )}
          {saveSuccess && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              // Nota: No hay color "success" en la paleta, usamos verde (emerald) con el mismo estilo
              className="bg-emerald-500/10 border border-emerald-500/20 text-emerald-700 dark:text-emerald-400 p-3 rounded-md flex items-center space-x-2 text-sm"
            >
              <Check className="w-5 h-5 flex-shrink-0" />
              <strong>Cambios guardados exitosamente.</strong>
            </motion.div>
          )}
        </AnimatePresence>

        {/* 💡 UI: Estilo de tarjeta (card) y título con borde */}
        <section className="bg-card text-card-foreground border rounded-lg shadow-sm p-6">
          <h2 className="text-xl font-semibold mb-4 border-b pb-3">
            Información Personal
          </h2>

          <div className="space-y-4">
            <div>
              {/* 💡 UI: Estilos de label de la paleta */}
              <label
                htmlFor="name"
                className="block text-sm font-medium text-foreground mb-1.5"
              >
                Nombre Visible
              </label>
              {/* 💡 UI: Estilos de input de la paleta (background, border, ring) */}
              <input
                id="name"
                type="text"
                value={profileDisplayName}
                onChange={(e) => setProfileDisplayName(e.target.value)}
                className="mt-1 block w-full bg-background border border-input rounded-md shadow-sm p-2 text-sm transition-colors
                           focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-foreground mb-1.5">
                Email
              </label>
              {/* 💡 UI: Estilo "deshabilitado" usando muted */}
              <p className="mt-1 p-2 bg-muted border border-input rounded-md text-muted-foreground text-sm">
                {profile.email}
              </p>
            </div>
          </div>
        </section>

        {/* 💡 UI/UX: Implementación visual de las preferencias */}
        <section className="bg-card text-card-foreground border rounded-lg shadow-sm p-6">
          <h2 className="text-xl font-semibold mb-4 border-b pb-3">
            Preferencias de Interfaz
          </h2>
          <div className="space-y-6">
            {/* 💡 UX: Selector de tema animado */}
            <div>
              <label className="block text-sm font-medium text-foreground mb-2">
                Tema
              </label>
              <div className="flex items-center space-x-1 bg-muted p-1 rounded-lg w-fit">
                <PreferenceButton
                  onClick={() => handlePreferenceChange('theme', 'light')}
                  isActive={profilePreferences.theme === 'light'}
                >
                  <Sun className="w-4 h-4 mr-1.5 inline-block" />
                  Claro
                </PreferenceButton>
                <PreferenceButton
                  onClick={() => handlePreferenceChange('theme', 'dark')}
                  isActive={profilePreferences.theme === 'dark'}
                >
                  <Moon className="w-4 h-4 mr-1.5 inline-block" />
                  Oscuro
                </PreferenceButton>
              </div>
            </div>

            {/* 💡 UI: Selector de color simple */}
            <div>
              <label className="block text-sm font-medium text-foreground mb-2">
                Paleta de Color
              </label>
              <div className="flex items-center space-x-3">
                {colorOptions.map((color) => (
                  <button
                    key={color}
                    type="button"
                    onClick={() => handlePreferenceChange('colorPalette', color)}
                    className={`w-8 h-8 rounded-full border-2 transition-all
                      ${
                        color === 'default'
                          ? 'bg-blue-600' // Asumido
                          : color === 'blue'
                            ? 'bg-sky-600' // Asumido
                            : 'bg-green-600' // Asumido
                      }
                      ${
                        profilePreferences.colorPalette === color
                          ? 'ring-2 ring-ring ring-offset-2 ring-offset-background'
                          : 'border-muted'
                      }
                    `}
                    aria-label={`Color ${color}`}
                  />
                ))}
              </div>
            </div>
          </div>
        </section>

        <div className="flex items-center space-x-4">
          {/* 💡 UI/UX: Botón primario con estado de carga (spinner) */}
          <button
            type="submit"
            disabled={isSaving}
            className={`inline-flex items-center justify-center px-4 py-2 text-sm font-medium text-primary-foreground
                      bg-primary rounded-md transition-colors
                      hover:bg-primary/90
                      focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2
                      disabled:opacity-50 disabled:cursor-not-allowed
                    `}
          >
            {isSaving ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Guardando...
              </>
            ) : (
              'Guardar Cambios'
            )}
          </button>
        </div>
      </form>
    </motion.div>
  );
}