"use client";

import { useState } from 'react';
import { useRouter } from 'next/navigation';

import {
  collection,
  query,
  where,
  getDocs,
  doc,
  writeBatch,
  setDoc,
} from 'firebase/firestore';
import { auth, db } from '@/lib/firebase';
import { useAuthState } from 'react-firebase-hooks/auth';


// Un componente simple para el spinner de carga
const Spinner = () => (
  <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
  </svg>
);


export default function OnboardingPage() {
  const [user, loadingAuth] = useAuthState(auth);
  const router = useRouter();
  const [mode, setMode] = useState<'create' | 'join'>('create'); // 'create' o 'join'
  const [teamName, setTeamName] = useState('');
  const [inviteCode, setInviteCode] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleCreateTeam = async (e: React.FormEvent) => {
    e.preventDefault();
  if (!teamName.trim() || !user) return;

  setIsLoading(true);
  setError(null);

  try {
    const batch = writeBatch(db);
    
    // 1. Crear el nuevo equipo (esto está bien)
    const newTeamRef = doc(collection(db, 'teams'));
    batch.set(newTeamRef, {
      teamId: newTeamRef.id,
      teamName: teamName.trim(),
      ownerUid: user.uid,
      createdAt: new Date(),
    });

    // 2. CORRECCIÓN: Crear la referencia del miembro con el ID compuesto
    const teamMemberId = `${newTeamRef.id}_${user.uid}`;
    const teamMemberRef = doc(db, 'teamMembers', teamMemberId);

    batch.set(teamMemberRef, {
      teamId: newTeamRef.id,
      userId: user.uid,
      rol: 'admin',
      joinedAt: new Date(),
    });

    await batch.commit();
    
    router.push(`/app/dashboard/${newTeamRef.id}`);

  } catch (err) {
    console.error("Error creando el equipo:", err);
    setError('No se pudo crear el equipo. Inténtalo de nuevo.');
    setIsLoading(false);
  }
  };

  const handleJoinTeam = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inviteCode.trim() || !user) return;

    setIsLoading(true);
    setError(null);

    try {
      // 1. Buscar el código de invitación
      const q = query(collection(db, 'invitationCodes'), where('code', '==', inviteCode.trim()));
      const querySnapshot = await getDocs(q);

      if (querySnapshot.empty) {
        setError('El código de invitación no es válido.');
        setIsLoading(false);
        return;
      }
      
      const invitation = querySnapshot.docs[0].data();
      const { teamId } = invitation;

      // 2. Añadir al usuario como miembro del equipo
      const newMemberRef = doc(collection(db, 'teamMembers'));
      await setDoc(newMemberRef, {
        teamId: teamId,
        userId: user.uid,
        rol: 'member',
        joinedAt: new Date(),
      });

      // Opcional: Eliminar o invalidar el código de invitación si es de un solo uso
      // await deleteDoc(doc(db, 'invitationCodes', querySnapshot.docs[0].id));

      // Redirigir al dashboard del equipo
      router.push(`/app/dashboard/${teamId}`);

    } catch (err) {
      console.error("Error al unirse al equipo:", err);
      setError('No se pudo unir al equipo. Verifica el código e inténtalo de nuevo.');
      setIsLoading(false);
    }
  };
  
  if (loadingAuth) {
    return <div className="flex h-screen items-center justify-center">Cargando...</div>
  }

  if (!user) {
    router.push('/login'); // Redirigir si no está autenticado
    return null;
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-background p-4">
      <div className="w-full max-w-md rounded-lg border border-border bg-card p-8 shadow-lg">
        <h1 className="text-3xl font-bold text-center text-card-foreground mb-2">¡Bienvenido!</h1>
        <p className="text-center text-muted-foreground mb-8">Para continuar, crea un nuevo equipo o únete a uno existente.</p>

        {/* Selector de modo */}
        <div className="flex w-full mb-6 rounded-md bg-muted p-1">
          <button
            onClick={() => setMode('create')}
            className={`w-1/2 rounded py-2 text-sm font-medium transition-colors ${
              mode === 'create' ? 'bg-primary text-primary-foreground shadow' : 'text-muted-foreground hover:bg-secondary'
            }`}
          >
            Crear Equipo
          </button>
          <button
            onClick={() => setMode('join')}
            className={`w-1/2 rounded py-2 text-sm font-medium transition-colors ${
              mode === 'join' ? 'bg-primary text-primary-foreground shadow' : 'text-muted-foreground hover:bg-secondary'
            }`}
          >
            Unirse a Equipo
          </button>
        </div>

        {/* Formularios */}
        {mode === 'create' ? (
          <form onSubmit={handleCreateTeam}>
            <label htmlFor="teamName" className="block text-sm font-medium text-foreground mb-2">
              Nombre del Equipo
            </label>
            <input
              id="teamName"
              type="text"
              value={teamName}
              onChange={(e) => setTeamName(e.target.value)}
              placeholder="Ej: Equipo de Desarrollo"
              className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
              required
            />
            <button
              type="submit"
              disabled={isLoading || !teamName.trim()}
              className="mt-6 flex w-full items-center justify-center rounded-md bg-primary py-2 px-4 text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {isLoading && <Spinner />}
              {isLoading ? 'Creando...' : 'Crear Equipo'}
            </button>
          </form>
        ) : (
          <form onSubmit={handleJoinTeam}>
            <label htmlFor="inviteCode" className="block text-sm font-medium text-foreground mb-2">
              Código de Invitación
            </label>
            <input
              id="inviteCode"
              type="text"
              value={inviteCode}
              onChange={(e) => setInviteCode(e.target.value)}
              placeholder="Pega el código aquí"
              className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
              required
            />
            <button
              type="submit"
              disabled={isLoading || !inviteCode.trim()}
              className="mt-6 flex w-full items-center justify-center rounded-md bg-primary py-2 px-4 text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {isLoading && <Spinner />}
              {isLoading ? 'Uniéndote...' : 'Unirse al Equipo'}
            </button>
          </form>
        )}

        {error && (
            <p className="mt-4 text-center text-sm text-destructive">{error}</p>
        )}
      </div>
    </div>
  );
}