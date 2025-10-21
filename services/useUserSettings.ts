// src/services/useUserSettings.ts

import { useState, useEffect } from 'react';
import { db } from '@/lib/firebase';
import { 
  doc, 
  onSnapshot, 
  DocumentData, 
  DocumentSnapshot,
  query, // Necesario para consultas más complejas
  collection,
  where,
  getDocs, // Para buscar la membresía
  getDoc
} from 'firebase/firestore';

// Tipos base (asumo que están en un archivo de tipos compartido o los defines aquí)
export type Preferences = {
  theme: 'dark' | 'light';
  colorPalette: 'default' | 'blue' | 'green';
};

export type UserProfile = {
  uid: string;
  email: string;
  // 💡 CAMBIO 1: Cambiamos 'nombre' a 'displayName' para reflejar el campo de Firestore
  displayName: string; 
  preferences: Preferences;
};

// Tipo de datos consolidado para la interfaz de usuario
export type UserSettingsData = {
    profile: UserProfile;
    membership: {
        teamId: string;
        role: 'admin' | 'member';
        teamName: string;
    } | null;
};

// --- Función de Mapeo de Perfil ---

const toUserProfile = (snapshot: DocumentSnapshot<DocumentData>): UserProfile | null => {
    if (!snapshot.exists()) return null;
    const data = snapshot.data();
    
    return {
        uid: snapshot.id,
        email: data.email || '',
        // 💡 CAMBIO 2: Leemos el campo 'displayName' de Firestore y lo asignamos
        displayName: data.displayName || 'Nombre no establecido', 
        preferences: data.preferences || { theme: 'light', colorPalette: 'default' },
    } as UserProfile;
};

export const useUserSettings = (uid: string) => {
    const [data, setData] = useState<UserSettingsData | null>(null);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        if (!uid) {
            setData(null);
            setIsLoading(false);
            return;
        }

        const userRef = doc(db, 'users', uid);
        
        // 1. Suscripción en tiempo real al Perfil (users)
        const unsubscribe = onSnapshot(userRef, async (userDoc) => {
            const userProfile = toUserProfile(userDoc);
            
            if (!userProfile) {
                setData(null);
                setIsLoading(false);
                return;
            }

            // 2. Buscar la membresía del equipo (teamMembers)
            const membershipQuery = query(
                collection(db, 'teamMembers'),
                where('userId', '==', uid)
            );
            
            const memberSnapshot = await getDocs(membershipQuery);

            let membershipData: UserSettingsData['membership'] = null;

            if (!memberSnapshot.empty) {
                const memberDoc = memberSnapshot.docs[0].data();
                const teamId = memberDoc.teamId;
                const role = memberDoc.rol as 'admin' | 'member';

                // 3. Obtener el nombre del equipo (teams)
                const teamDoc = await getDoc(doc(db, 'teams', teamId));
                const teamName = teamDoc.exists() ? teamDoc.data().teamName : 'Equipo Desconocido';

                membershipData = { teamId, role, teamName };
            }

            // Consolidar y actualizar el estado
            setData({
                profile: userProfile,
                membership: membershipData,
            });
            setIsLoading(false);

        }, (error) => {
            console.error("Error al obtener la configuración de usuario:", error);
            setIsLoading(false);
            setData(null);
        });

        return () => unsubscribe();
    }, [uid]);

    return { data, isLoading };
};