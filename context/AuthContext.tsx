// En, por ejemplo, context/AuthContext.tsx
'use client';

import { 
  useEffect, 
  useState, 
  useCallback, 
  createContext, 
  useContext,
  type ReactNode
} from 'react';
import { type User as FirebaseUser, onAuthStateChanged, signOut } from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore';
import { auth, db } from '@/lib/firebase';
import type { User } from '@/types'; // Tu tipo de usuario de Firestore

// Interfaz para el valor del contexto
interface AuthContextType {
  user: User | null;      // Un solo objeto de usuario, combinado y listo para usar
  isLoading: boolean;
  logout: () => Promise<void>;
}

// 1. Creamos el Contexto con un valor inicial undefined
const AuthContext = createContext<AuthContextType | undefined>(undefined);

// 2. Creamos el Proveedor (AuthProvider)
// Este componente envolverá tu aplicación y gestionará el estado de autenticación.
export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true); // Empieza en true hasta que se verifique el estado inicial

  const logout = useCallback(async () => {
    try {
      await signOut(auth);
      // El listener onAuthStateChanged se encargará de poner user a null
    } catch (error) {
      console.error("Error al cerrar sesión:", error);
    }
  }, []);

  useEffect(() => {
    // Este listener es el corazón de la autenticación en tiempo real
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser: FirebaseUser | null) => {
      try {
        if (firebaseUser) {
          // Usuario autenticado: buscamos su perfil en Firestore
          const userDocRef = doc(db, "users", firebaseUser.uid);
          const userDoc = await getDoc(userDocRef);

          if (userDoc.exists()) {
            // Combinamos el uid de Auth con los datos de Firestore
            const userData = {
              uid: firebaseUser.uid,
              ...userDoc.data()
            } as User;
            setUser(userData);
          } else {
            // Caso borde: usuario en Firebase Auth pero no en Firestore.
            // Puedes manejarlo creando un documento aquí o simplemente no logueándolo.
            console.warn("Usuario autenticado pero sin perfil en Firestore.");
            setUser(null);
          }
        } else {
          // No hay usuario autenticado
          setUser(null);
        }
      } catch (error) {
        console.error("Error en el estado de autenticación:", error);
        setUser(null);
      } finally {
        // La verificación inicial ha terminado, ya no estamos cargando
        setIsLoading(false);
      }
    });

    // La función de limpieza que se ejecuta cuando el componente se desmonta
    return () => unsubscribe();
  }, []);

  const value = { user, isLoading, logout };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}

// 3. Creamos el Hook (useAuth)
// Este es el hook que tus componentes usarán para acceder al contexto.
export function useAuth() {
  const context = useContext(AuthContext);

  if (context === undefined) {
    throw new Error('useAuth debe ser usado dentro de un AuthProvider');
  }

  return context;
}