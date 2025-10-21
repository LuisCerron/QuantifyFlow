// src/services/teamService.ts

import { db } from '@/lib/firebase';
import { doc, getDoc, updateDoc, collection, addDoc, serverTimestamp, query, where, deleteDoc, getDocs } from 'firebase/firestore';
import { useState, useEffect } from 'react';

// --- Tipos ---

export type Team = { teamId: string; teamName: string; ownerUid: string; };
export type Tag = { tagId: string; teamId: string; tagName: string; color: string; };
export type InvitationCode = { code: string; teamId: string; expiresAt: Date; };

interface TeamSettingsData {
    team: Team | null;
    tags: Tag[];
}

export const useAdminTeamData = (teamId: string) => {
    const [data, setData] = useState<{ team: Team | null, tags: Tag[] }>({ team: null, tags: [] });
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        if (!teamId) {
            setIsLoading(false);
            return;
        }

        const teamRef = doc(db, 'teams', teamId);
        
        // Función para obtener TeamName y Tags
        const fetchData = async () => {
            try {
                // Obtener Team
                const teamDoc = await getDoc(teamRef);
                const team = teamDoc.exists() ? ({ ...teamDoc.data(), teamId: teamDoc.id } as Team) : null;

                // Obtener Tags
                const tagsQuery = query(collection(db, 'tags'), where('teamId', '==', teamId));
                const tagsSnapshot = await getDocs(tagsQuery);
                const tags = tagsSnapshot.docs.map(doc => ({ ...doc.data(), tagId: doc.id })) as Tag[];

                setData({ team, tags });
            } catch (error) {
                console.error("Error al cargar datos de administrador:", error);
                setData({ team: null, tags: [] });
            } finally {
                setIsLoading(false);
            }
        };

        fetchData();
        // Nota: Si quieres reactividad en tiempo real en esta página,
        // deberías usar onSnapshot para tags y teamDoc.
    }, [teamId]);

    return { team: data.team, tags: data.tags, isLoading };
};
// --- FUNCIÓN: Actualizar Nombre del Equipo (teams) ---

export const updateTeamName = async (teamId: string, newName: string): Promise<void> => {
    const teamRef = doc(db, 'teams', teamId);
    await updateDoc(teamRef, { teamName: newName });
};

// --- FUNCIÓN: Generar Código de Invitación (invitationCodes) ---

/** Genera un código de 6 caracteres y lo guarda en Firestore con una expiración (24h). */
export const generateInvitationCode = async (teamId: string): Promise<string> => {
    const code = Math.random().toString(36).substring(2, 8).toUpperCase();
    const expirationTime = new Date();
    expirationTime.setDate(expirationTime.getDate() + 1); // Expira en 24 horas

    await addDoc(collection(db, 'invitationCodes'), {
        code,
        teamId,
        expiresAt: expirationTime, // Usamos Date para que Firebase lo convierta a Timestamp
    });
    
    return code;
};

// --- FUNCIÓN: CRUD de Tags (tags) ---

export const createTag = async (teamId: string, tagName: string, color: string): Promise<Tag> => {
    const newTagRef = await addDoc(collection(db, 'tags'), {
        teamId,
        tagName,
        color,
    });
    return { tagId: newTagRef.id, teamId, tagName, color };
};

export const deleteTag = async (tagId: string): Promise<void> => {
    const tagRef = doc(db, 'tags', tagId);
    await deleteDoc(tagRef);
};