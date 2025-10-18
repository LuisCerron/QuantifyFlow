'use server';

import { db } from '@/lib/firebase'; // Tu configuración de Firebase/Firestore
import { collection, query, where, getDocs, addDoc, doc, updateDoc } from 'firebase/firestore';
import { revalidatePath } from 'next/cache';

// Acción para obtener detalles básicos de la invitación (seguro de exponer)
export async function getInvitationDetails(code: string): Promise<{ teamName: string; invitedBy: string } | null> {
  const invitationsRef = collection(db, 'invitationCodes');
  const q = query(invitationsRef, where('code', '==', code), where('status', '==', 'pending'));
  const querySnapshot = await getDocs(q);

  if (querySnapshot.empty) {
    return null;
  }

  const invitationDoc = querySnapshot.docs[0];
  const invitationData = invitationDoc.data();
  
  // Aquí, necesitarías buscar el nombre del equipo y del invitador.
  // Esta es una implementación simplificada.
  const teamName = `Equipo con ID: ${invitationData.teamId}`; 
  const invitedBy = `Usuario con ID: ${invitationData.invitedBy}`;

  return { teamName, invitedBy };
}


// Acción para aceptar la invitación (lógica principal)
export async function acceptInvitation(code: string, userId: string): Promise<{ success: boolean; error?: string; teamId?: string }> {
  const invitationsRef = collection(db, 'invitationCodes');
  const q = query(invitationsRef, where('code', '==', code), where('status', '==', 'pending'));
  
  const querySnapshot = await getDocs(q);

  if (querySnapshot.empty) {
    return { success: false, error: 'El código de invitación no es válido o ya fue utilizado.' };
  }

  const invitationDoc = querySnapshot.docs[0];
  const invitationData = invitationDoc.data();
  const { teamId } = invitationData;

  // 1. Verificar si el usuario ya es miembro del equipo
  const teamMembersRef = collection(db, 'teamMembers');
  const memberQuery = query(teamMembersRef, where('teamId', '==', teamId), where('userId', '==', userId));
  const memberSnapshot = await getDocs(memberQuery);

  if (!memberSnapshot.empty) {
    return { success: false, error: 'Ya eres miembro de este equipo.' };
  }

  try {
    // 2. Crear el nuevo documento en teamMembers
    await addDoc(teamMembersRef, {
      teamId: teamId,
      userId: userId,
      role: 'member', // Rol por defecto
      joinedAt: new Date(),
    });

    // 3. (Opcional pero recomendado) Actualizar el estado de la invitación
    const invitationDocRef = doc(db, 'invitationCodes', invitationDoc.id);
    await updateDoc(invitationDocRef, {
      status: 'accepted',
      acceptedBy: userId,
      acceptedAt: new Date(),
    });
    
    // Invalida el caché de rutas relacionadas para que Next.js muestre los datos actualizados
    revalidatePath(`/app/team/${teamId}`);

    return { success: true, teamId: teamId };

  } catch (error) {
    console.error("Error al aceptar invitación:", error);
    return { success: false, error: 'Ocurrió un error en el servidor.' };
  }
}