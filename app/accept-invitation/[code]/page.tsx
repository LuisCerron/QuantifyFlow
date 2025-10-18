// Marcamos este componente como un Client Component para poder usar hooks como useState y useEffect.
'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { acceptInvitation, getInvitationDetails } from './actions';
import { useAuth } from '@/context/AuthContext'; 

// Definimos una interfaz para los detalles de la invitación
interface InvitationDetails {
  teamName: string;
  invitedBy: string;
}

export default function AcceptInvitationPage({ params }: { params: { code: string } }) {
  const { code } = params;
  const router = useRouter();
  const { user, isLoading: isAuthLoading } = useAuth(); // Hook para obtener el usuario actual

  const [invitation, setInvitation] = useState<InvitationDetails | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // 1. Efecto para validar el código de invitación cuando la página carga
  useEffect(() => {
    const validateCode = async () => {
      try {
        const details = await getInvitationDetails(code);
        if (details) {
          setInvitation(details);
        } else {
          setError('El código de invitación no es válido o ha expirado.');
        }
      } catch (err) {
        setError('Ocurrió un error al verificar la invitación.');
      } finally {
        setIsLoading(false);
      }
    };

    validateCode();
  }, [code]);

  // 2. Función para manejar el clic en "Aceptar"
  const handleAccept = async () => {
    if (!user) {
      // Si el usuario no está logueado, lo redirigimos a iniciar sesión.
      // El redirectUrl asegura que vuelva aquí después de loguearse.
      router.push(`/login?redirectUrl=/app/accept-invitation/${code}`);
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const result = await acceptInvitation(code, user.uid);
      if (result.success) {
        // Redirigir al dashboard del equipo si la operación fue exitosa
        router.push(`/app/team/${result.teamId}/dashboard`);
      } else {
        setError(result.error || 'No se pudo aceptar la invitación.');
      }
    } catch (err) {
      setError('Ocurrió un error inesperado.');
    } finally {
      setIsLoading(false);
    }
  };
  
  // Renderizado de la UI
  if (isAuthLoading || isLoading) {
    return <div>Cargando invitación...</div>;
  }

  if (error) {
    return <div>Error: {error}</div>;
  }

  if (!invitation) {
    return <div>Verificando invitación...</div>;
  }

  return (
    <div>
      <h1>Unirse al equipo {invitation.teamName}</h1>
      <p>Has sido invitado por {invitation.invitedBy} para unirte a su equipo.</p>
      
      {user ? (
        <button onClick={handleAccept} disabled={isLoading}>
          {isLoading ? 'Procesando...' : 'Aceptar Invitación'}
        </button>
      ) : (
        <div>
          <p>Para aceptar, por favor inicia sesión o crea una cuenta.</p>
          <button onClick={() => router.push(`/login?redirectUrl=/app/accept-invitation/${code}`)}>
            Iniciar Sesión
          </button>
          <button onClick={() => router.push(`/signup?redirectUrl=/app/accept-invitation/${code}`)}>
            Registrarse
          </button>
        </div>
      )}
    </div>
  );
}