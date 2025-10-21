// src/services/userService.ts

import { useState, useEffect } from 'react';
import { db } from '@/lib/firebase'; // Asume que tienes inicializado Firebase y exportas 'db' (Firestore)
import { 
  doc, 
  onSnapshot, // Mantener onSnapshot para lectura en tiempo real
  updateDoc, 
  DocumentData, 
  DocumentSnapshot 
} from 'firebase/firestore'; 
// Eliminé getDoc si no se usa directamente.

// --- Tipos de la Estructura de Datos ---

/**
 * Define la estructura de las preferencias de UI del usuario.
 */
export type Preferences = {
  theme: 'dark' | 'light';
  colorPalette: 'default' | 'blue' | 'green';
};

/**
 * Define la estructura completa del documento de usuario.
 */
export type UserProfile = {
  uid: string;
  email: string;
  nombre: string; // <-- Este es el campo que usaremos
  preferences: Preferences;
};

// --- Función de Conversión ---

/**
 * Convierte un DocumentSnapshot de Firestore a un objeto UserProfile.
 */
const toUserProfile = (snapshot: DocumentSnapshot<DocumentData>): UserProfile | null => {
  if (!snapshot.exists()) return null;
  const data = snapshot.data();
  
  return {
    uid: snapshot.id,
    email: data.email || '',
    // 💡 CORRECCIÓN APLICADA: Ahora lee directamente el campo 'nombre' del documento.
    // Utilizamos el campo 'nombre' del documento si existe, si no, usamos 'Nombre no establecido'.
    nombre: data.displayName || 'Nombre no establecido', 
    preferences: data.preferences || { theme: 'light', colorPalette: 'default' },
    // Aseguramos que 'preferences' tenga valores por defecto si no existen
  } as UserProfile;
};


// -------------------------------------------------------------------
// --- HOOK: Lectura de Perfil de Usuario (users) (Sin cambios) ---
// -------------------------------------------------------------------

/**
 * Hook para leer en tiempo real el documento del usuario actual.
 */
export const useUser = (uid: string) => {
  const [user, setUser] = useState<UserProfile | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!uid) {
      setUser(null);
      setIsLoading(false);
      return;
    }

    const userRef = doc(db, 'users', uid);
    
    const unsubscribe = onSnapshot(userRef, (docSnap) => {
      const profile = toUserProfile(docSnap);
      setUser(profile);
      setIsLoading(false);
    }, (error) => {
      console.error("Error al suscribirse al perfil de usuario:", error);
      setIsLoading(false);
      setUser(null);
    });

    return () => unsubscribe();
  }, [uid]);

  return { user, isLoading };
};


// -------------------------------------------------------------------
// --- FUNCIÓN: Actualización de Perfil de Usuario (users) (Sin cambios) ---
// -------------------------------------------------------------------

/**
 * Función para actualizar el nombre o las preferencias del usuario.
 */
export const updateUserProfile = async (
  uid: string, 
  data: { displayName?: string; preferences?: Partial<Preferences> }
): Promise<void> => {
  if (!uid) {
    throw new Error('El UID del usuario no puede ser nulo.');
  }

  const userRef = doc(db, 'users', uid);
  
  const updateData: { [key: string]: any } = {};

  // 💡 El campo 'nombre' en el objeto 'data' se mapea directamente al campo 'nombre' de Firestore.
  if (data.displayName !== undefined) {
    updateData.displayName = data.displayName;
  }
  
  if (data.preferences !== undefined) {
    updateData.preferences = data.preferences; 
  }
  
  if (Object.keys(updateData).length === 0) {
    console.warn('No hay datos para actualizar en el perfil de usuario.');
    return;
  }

  try {
    await updateDoc(userRef, updateData);
    console.log(`Perfil de usuario ${uid} actualizado exitosamente.`);
  } catch (error) {
    console.error(`Error al actualizar el perfil de usuario ${uid}:`, error);
    throw new Error('Fallo al actualizar el perfil en la base de datos.');
  }
};