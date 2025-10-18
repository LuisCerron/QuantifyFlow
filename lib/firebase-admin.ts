// lib/firebase-admin.ts
import admin from 'firebase-admin';

// Esta función asegura que Firebase Admin se inicialice solo una vez.
// Es "idempotente", lo que significa que puedes llamarla varias veces sin problemas.
export const initializeAdminApp = async () => {
  // Si la app de admin ya está inicializada, no hacemos nada más.
  if (admin.apps.length > 0) {
    return;
  }

  try {
    // Leemos las credenciales desde las variables de entorno.
    // El 'try-catch' es crucial para evitar que la aplicación se caiga
    // si la variable de entorno no está configurada o es inválida.
    const serviceAccount = JSON.parse(
      process.env.FIREBASE_SERVICE_ACCOUNT_KEY as string
    );

    // Inicializamos la app de admin con las credenciales.
    admin.initializeApp({
      credential: admin.credential.cert(serviceAccount),
    });

    console.log("Firebase Admin SDK inicializado correctamente.");
  } catch (error) {
    console.error("Error al inicializar Firebase Admin SDK:", error);
    // Lanzamos un error más descriptivo para facilitar la depuración.
    throw new Error("Las credenciales de Firebase Admin no están configuradas correctamente o son inválidas.");
  }
};

// Exportamos el módulo 'admin' completo.
// De esta forma, después de llamar a initializeAdminApp(), puedes acceder
// a todos los servicios de Firebase Admin de forma segura (auth, firestore, etc.).
export { admin };