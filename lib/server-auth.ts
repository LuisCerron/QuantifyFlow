import { cookies } from 'next/headers';
// Asumo que tu lib/firebase-admin exporta 'admin' y que tiene los métodos de auth
import { admin, initializeAdminApp } from './firebase-admin'; 
import { type DecodedIdToken } from 'firebase-admin/auth';
import 'server-only'; // Recomendado para asegurar que este código solo corre en el servidor

// Define la interfaz de usuario que necesita el DashboardPage
export interface CurrentUser {
  uid: string;
  email?: string;
  displayName?: string;
}

/**
 * Lee la cookie de sesión del request y verifica el token usando Firebase Admin.
 * @returns Los datos del usuario actual o null si no está autenticado o la cookie es inválida.
 */
export async function getCurrentUser(): Promise<CurrentUser | null> {
  await initializeAdminApp(); 
  
  const sessionCookie = cookies().get('session')?.value;

  // Log 1: Verificar si la cookie existe
  if (!sessionCookie) {
    console.log("❌ SERVER AUTH: No session cookie found.");
    return null;
  }
  
  // Log 2: Notificar que se encontró la cookie y se intentará verificar
  console.log("✅ SERVER AUTH: Session cookie found. Verifying with Firebase Admin...");

  try {
    const decodedToken: DecodedIdToken = await admin.auth().verifySessionCookie(sessionCookie, true);
    
    // Log 3: Verificar que la decodificación fue exitosa
    console.log("⭐ SERVER AUTH: Token verified. User UID:", decodedToken.uid);

    return {
      uid: decodedToken.uid,
      email: decodedToken.email,
      displayName: decodedToken.name || decodedToken.email?.split('@')[0], 
    } as CurrentUser;

  } catch (error) {
    // Log 4: Capturar cualquier error de verificación (expiración, revocación)
    console.error("❌ SERVER AUTH ERROR: Cookie verification failed.", error);
    // Borrar la cookie para forzar un nuevo login limpio
    cookies().delete('session'); 
    return null;
  }
}