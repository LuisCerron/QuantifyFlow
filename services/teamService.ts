// src/services/teamService.ts

import { db } from '@/lib/firebase';
import { doc, getDoc, updateDoc, collection, addDoc, serverTimestamp, query, where, deleteDoc, getDocs, Timestamp } from 'firebase/firestore';
import { useState, useEffect, useCallback } from 'react';
import { chunkArray } from '@/lib/utils/helpers';

const FIREBASE_IN_LIMIT = 10;

function serializeForClient<T extends Record<string, any>>(data: T): T {
  const serialized = { ...data } as Record<string, any>;
  
  for (const key in serialized) {
    const value = serialized[key];
    
    if (value && typeof value === 'object' && 'toDate' in value && typeof value.toDate === 'function') {
      serialized[key] = value.toDate().toISOString();
    }
    else if (value && typeof value === 'object' && 'seconds' in value && 'nanoseconds' in value) {
      serialized[key] = new Date(value.seconds * 1000).toISOString();
    }
    else if (Array.isArray(value)) {
      serialized[key] = value.map((item: any) => 
        typeof item === 'object' && item !== null ? serializeForClient(item) : item
      );
    }
    else if (value && typeof value === 'object' && value !== null && !('toDate' in value) && !('seconds' in value)) {
      serialized[key] = serializeForClient(value);
    }
  }
  
  return serialized as T;
}

// --- Tipos ---
import { User } from '@/types';
export type Team = { teamId: string; teamName: string; ownerUid: string; };
export type Tag = { tagId: string; teamId: string; tagName: string; color: string; };
export type InvitationCode = { code: string; teamId: string; expiresAt: Date; };
export type TeamMemberRol = 'admin' | 'member';

export interface TeamMember { // Documento en Firestore 'teamMembers'
  id: string;
  teamId: string;
  userId: string;
  rol: TeamMemberRol;
  joinedAt: Timestamp;
}
export interface TeamMemberWithDetails extends User { // Objeto combinado para la UI
  rol: TeamMemberRol;
  teamMemberDocId: string;
}

async function batchFetchUsers(userIds: string[]): Promise<Record<string, User>> {
  const users: Record<string, User> = {};
  if (userIds.length === 0) return users;

  const uniqueIds = [...new Set(userIds)];
  const chunks = chunkArray(uniqueIds, FIREBASE_IN_LIMIT);
  await Promise.all(
    chunks.map(async (chunk) => {
      const q = query(collection(db, 'users'), where('__name__', 'in', chunk));
      const snapshot = await getDocs(q);
      snapshot.docs.forEach((d) => {
        users[d.id] = { uid: d.id, ...d.data() } as User;
      });
    })
  );
  return users;
}


export const useAdminTeamData = (teamId: string) => {
  // Estado para todos los datos
  const [data, setData] = useState<{
    team: Team | null;
    tags: Tag[];
    members: TeamMemberWithDetails[]; // 👈 Añadir miembros
  }>({ team: null, tags: [], members: [] });

  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null); // 👈 Añadir estado de error

  // Usamos useCallback para poder exponer la función de refetch
  const fetchData = useCallback(async () => {
    if (!teamId) {
      setIsLoading(false);
      setData({ team: null, tags: [], members: [] }); // Limpiar estado si no hay teamId
      return;
    }

    setIsLoading(true);
    setError(null); // Limpiar error previo

    try {
      // --- Consultas en Paralelo ---
      const teamRef = doc(db, 'teams', teamId);
      const tagsQuery = query(collection(db, 'tags'), where('teamId', '==', teamId));
      const membersQuery = query(collection(db, 'teamMembers'), where('teamId', '==', teamId));

      const [teamDoc, tagsSnapshot, membersSnapshot] = await Promise.all([
        getDoc(teamRef),
        getDocs(tagsQuery),
        getDocs(membersQuery),
      ]);

      // --- Procesar Equipo ---
      const team = teamDoc.exists() ? ({ ...teamDoc.data(), teamId: teamDoc.id } as Team) : null;

      // --- Procesar Tags ---
      const tags = tagsSnapshot.docs.map(doc => ({ ...doc.data(), tagId: doc.id })) as Tag[];

      // --- Procesar Miembros ---
      let members: TeamMemberWithDetails[] = [];
      if (!membersSnapshot.empty) {
        const memberDocsData = membersSnapshot.docs.map(doc => ({
           id: doc.id,
           ...(doc.data() as Omit<TeamMember, 'id'>)
        }));
        
        const userIds = memberDocsData.map(m => m.userId);

        if (userIds.length > 0) {
          const usersData = await batchFetchUsers(userIds);

          members = memberDocsData.map(memberDoc => {
            const userDetail = usersData[memberDoc.userId];
            return serializeForClient({
              ...(userDetail || { uid: memberDoc.userId, displayName: 'Usuario Desconocido' }),
              rol: memberDoc.rol,
              teamMemberDocId: memberDoc.id,
              joinedAt: memberDoc.joinedAt,
            });
          }).sort((a,b) => (a.displayName ?? '').localeCompare(b.displayName ?? ''));
        }
      }

      setData({ team: team ? serializeForClient(team) : null, tags, members });

    } catch (err: any) {
      console.error("Error al cargar datos de administrador:", err);
      setError(err); // Guardar el error
      setData({ team: null, tags: [], members: [] }); // Resetear datos en caso de error
    } finally {
      setIsLoading(false);
    }
  }, [teamId]); // fetchData depende solo de teamId

  // Efecto para llamar a fetchData cuando teamId cambie
  useEffect(() => {
    fetchData();
  }, [fetchData]); // El efecto ahora depende de la función memoizada

  // Devolvemos los datos, estado de carga, error y la función para refetch
  return { ...data, isLoading, error, refetch: fetchData };
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
export const updateTeamMemberRole = async (
  teamMemberDocId: string,
  newRole: TeamMemberRol
): Promise<void> => {
  // Validación básica del rol
  if (newRole !== 'admin' && newRole !== 'member') {
     throw new Error("Rol inválido. Debe ser 'admin' o 'member'.");
  }
  
  const memberRef = doc(db, 'teamMembers', teamMemberDocId);
  
  try {
    await updateDoc(memberRef, { rol: newRole });
    console.log(`Rol actualizado para ${teamMemberDocId} a ${newRole}`);
    // Opcional: Podrías añadir un ActivityLog aquí si lo deseas.
    // await createActivityLog({ teamId: ..., userId: ..., action: 'member_role_updated', details: { updatedMemberDocId: teamMemberDocId, newRole } });
  } catch (error) {
     console.error(`Error al actualizar el rol para ${teamMemberDocId}:`, error);
     throw new Error("No se pudo actualizar el rol del miembro."); // Relanzar para que la UI lo maneje
  }
};