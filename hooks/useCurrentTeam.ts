"use client";

import { useState, useEffect } from 'react';
import { db } from '@/lib/firebase';
import { 
  query,
  collection,
  where,
  getDocs,
  doc,
  getDoc
} from 'firebase/firestore';

import { TeamMember } from '@/types'; // Asumo que tienes un tipo TeamMember

// Tipos que podrías tener en /types/index.ts
type Team = {
  teamId: string;
  teamName: string;
};

type UserRole = 'admin' | 'member';

type UseCurrentTeamReturn = {
  currentTeam: Team | null;
  userRole: UserRole | null;
  isLoading: boolean;
};


export const useCurrentTeam = (uid?: string): UseCurrentTeamReturn => {
    const [currentTeam, setCurrentTeam] = useState<Team | null>(null);
    const [userRole, setUserRole] = useState<UserRole | null>(null);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        if (!uid) {
            setIsLoading(false);
            return;
        }

        const fetchTeamInfo = async () => {
          setIsLoading(true);
          try {
            // 1. Buscar la membresía del usuario
            const membershipQuery = query(
              collection(db, 'teamMembers'),
              where('userId', '==', uid)
            );
            const memberSnapshot = await getDocs(membershipQuery);

            if (memberSnapshot.empty) {
              console.warn(`No se encontró membresía de equipo para el usuario: ${uid}`);
              setIsLoading(false);
              return;
            }

            const memberDoc = memberSnapshot.docs[0].data() as TeamMember;
            const teamId = memberDoc.teamId;
            const role = memberDoc.rol as UserRole;
            setUserRole(role);

            // 2. Obtener el nombre del equipo
            const teamDoc = await getDoc(doc(db, 'teams', teamId));
            const teamName = teamDoc.exists() ? teamDoc.data().teamName : 'Equipo Desconocido';
            
            setCurrentTeam({ teamId, teamName });

          } catch (error) {
            console.error("Error fetching team info:", error);
          } finally {
            setIsLoading(false);
          }
        };

        fetchTeamInfo();
    }, [uid]);

    return { currentTeam, userRole, isLoading };
};
