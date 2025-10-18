import { cookies } from 'next/headers';
import { cache } from 'react';
import { initializeAdminApp, admin } from '@/lib/firebase-admin';

/**
 * Define un tipo de dato para el usuario autenticado que usaremos en la app.
 * Contiene solo la información esencial y segura para pasar entre componentes.
 */
export interface AuthenticatedUser {
  uid: string;
  email?: string;
  displayName?: string;
}

/**
 * Obtiene la sesión del usuario actual a partir de la cookie de sesión.
 * * Esta función está diseñada para ser usada exclusivamente en el servidor
 * (Server Components, Layouts, API Routes).
 * * Utiliza `cache` de React para garantizar que la verificación de la cookie
 * se ejecute una sola vez por cada petición al servidor, optimizando el rendimiento.
 */
export const getCurrentUser = cache(async (): Promise<AuthenticatedUser | null> => {
  // 1. Asegura que el SDK de Firebase Admin esté listo para usarse.
  await initializeAdminApp();

  // 2. Lee la cookie 'session' desde la petición entrante.
  const sessionCookie = cookies().get('session')?.value;

  if (!sessionCookie) {
    // Si no existe la cookie, el usuario no ha iniciado sesión.
    return null;
  }

  try {
    // 3. Verifica la validez de la cookie con Firebase Admin.
    // El segundo parámetro 'true' verifica si la sesión ha sido revocada.
    const decodedToken = await admin.auth().verifySessionCookie(sessionCookie, true);

    // 4. Si la cookie es válida, extraemos y devolvemos los datos del usuario.
    const currentUser: AuthenticatedUser = {
      uid: decodedToken.uid,
      email: decodedToken.email,
      displayName: decodedToken.name, // El token incluye 'name' para displayName
    };
    
    return currentUser;

  } catch (error) {
    // La cookie es inválida (expirada, malformada, etc.).
    // Esto es un caso normal, no necesariamente un error crítico.
    console.log("Cookie de sesión inválida o expirada:", error);
    
    // Opcional pero recomendado: Limpia la cookie inválida del navegador del usuario.
    cookies().delete('session');

    return null;
  }
});