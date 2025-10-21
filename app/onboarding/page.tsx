"use client";

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { collection, query, where, getDocs, doc, writeBatch, setDoc } from 'firebase/firestore';
import { auth, db } from '@/lib/firebase';
import { useAuthState } from 'react-firebase-hooks/auth';
import { Loader2, Building, UserPlus } from 'lucide-react';

// Componentes de UI (asegúrate de haberlos añadido con shadcn/ui)
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { toast } from 'sonner';

export default function OnboardingPage() {
  const [user, loadingAuth] = useAuthState(auth);
  const router = useRouter();
  
  const [teamName, setTeamName] = useState('');
  const [inviteCode, setInviteCode] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'create' | 'join'>('create');

  const createSessionAndRedirect = async () => {
    if (!user) {
      throw new Error("Usuario no autenticado.");
    }
    const toastId = toast.loading("Redireccionando...");
    try {
      const idToken = await user.getIdToken(true); // Obtiene el token del usuario
      
      // Llama a tu nueva API para crear la cookie de sesión
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ token: idToken }),
      });

      if (!response.ok) {
        throw new Error("Fallo al crear la sesión del servidor.");
      }
      toast.success("Redirigiendo al dashboard...", { id: toastId });
      router.push('/dashboard');

    } catch (apiError) {
      console.error("Error en createSessionAndRedirect:", apiError);
      setError("Hubo un problema al iniciar sesión. Por favor, intenta de nuevo.");
      setIsLoading(false); // Detiene la carga si la API falla
    }
  };

  const handleCreateTeam = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!teamName.trim() || !user) return;

    setIsLoading(true);
    setError(null);

    const toastId = toast.loading("Creando equipo...");

    try {
      const batch = writeBatch(db);
      
      const newTeamRef = doc(collection(db, 'teams'));
      batch.set(newTeamRef, {
        teamId: newTeamRef.id,
        teamName: teamName.trim(),
        ownerUid: user.uid,
        createdAt: new Date(),
      });

      const teamMemberId = `${newTeamRef.id}_${user.uid}`;
      const teamMemberRef = doc(db, 'teamMembers', teamMemberId);
      batch.set(teamMemberRef, {
        teamId: newTeamRef.id,
        userId: user.uid,
        rol: 'admin',
        joinedAt: new Date(),
      });
      toast.success("Equipo creado con éxito.", { id: toastId });
      await batch.commit();
      await createSessionAndRedirect();

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
    const toastId = toast.loading("Uniendo a equipo existente...");
    try {
      const q = query(collection(db, 'invitationCodes'), where('code', '==', inviteCode.trim()));
      const querySnapshot = await getDocs(q);

      if (querySnapshot.empty) {
        setError('El código de invitación no es válido.');
        setIsLoading(false);
        return;
      }
      
      const invitation = querySnapshot.docs[0].data();
      const { teamId } = invitation;

      const teamMemberId = `${teamId}_${user.uid}`;
      const newMemberRef = doc(db, 'teamMembers', teamMemberId);
      await setDoc(newMemberRef, {
        teamId: teamId,
        userId: user.uid,
        rol: 'member',
        joinedAt: new Date(),
      });
      toast.success("Te has unido al equipo con éxito.", { id: toastId });
      await createSessionAndRedirect();

    } catch (err) {
      console.error("Error al unirse al equipo:", err);
      setError('No se pudo unir al equipo. Verifica el código e inténtalo de nuevo.');
      setIsLoading(false);
    }
  };
  
  if (loadingAuth) {
    return (
        <div className="flex h-screen items-center justify-center bg-background">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
    );
  }

  if (!user) {
    router.push('/login');
    return null;
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-4">
      <Tabs 
        defaultValue="create" 
        className="w-full max-w-md"
        onValueChange={(value) => setActiveTab(value as 'create' | 'join')}
      >
        <Card>
          <CardHeader className="text-center">
            <CardTitle className="text-2xl font-bold tracking-tight">¡Bienvenido a QuantifyFlow!</CardTitle>
            <CardDescription>Para empezar, crea un nuevo equipo o únete a uno existente.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="create">
                <Building className="mr-2 h-4 w-4" />
                Crear Equipo
              </TabsTrigger>
              <TabsTrigger value="join">
                <UserPlus className="mr-2 h-4 w-4" />
                Unirse a Equipo
              </TabsTrigger>
            </TabsList>
            
            {/* Formulario para Crear Equipo */}
            <TabsContent value="create">
              <form onSubmit={handleCreateTeam}>
                <div className="space-y-4">
                    <div className="space-y-2">
                        <Label htmlFor="teamName">Nombre del Equipo</Label>
                        <Input
                            id="teamName"
                            type="text"
                            value={teamName}
                            onChange={(e) => setTeamName(e.target.value)}
                            placeholder="Ej: Equipo de Innovación"
                            required
                            disabled={isLoading}
                        />
                    </div>
                    <Button type="submit" className="w-full" disabled={isLoading || !teamName.trim()}>
                        {isLoading && activeTab === 'create' && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                        {isLoading && activeTab === 'create' ? 'Creando...' : 'Crear Equipo'}
                    </Button>
                </div>
              </form>
            </TabsContent>

            {/* Formulario para Unirse a Equipo */}
            <TabsContent value="join">
                <form onSubmit={handleJoinTeam}>
                    <div className="space-y-4">
                        <div className="space-y-2">
                            <Label htmlFor="inviteCode">Código de Invitación</Label>
                            <Input
                                id="inviteCode"
                                type="text"
                                value={inviteCode}
                                onChange={(e) => setInviteCode(e.target.value)}
                                placeholder="Pega el código aquí"
                                required
                                disabled={isLoading}
                            />
                        </div>
                        <Button type="submit" className="w-full" disabled={isLoading || !inviteCode.trim()}>
                            {isLoading && activeTab === 'join' && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                            {isLoading && activeTab === 'join' ? 'Uniéndote...' : 'Unirse al Equipo'}
                        </Button>
                    </div>
                </form>
            </TabsContent>
          </CardContent>
          <CardFooter className="flex justify-center">
            {error && (
              <p className="text-sm font-medium text-destructive">{error}</p>
            )}
          </CardFooter>
        </Card>
      </Tabs>
    </div>
  );
}