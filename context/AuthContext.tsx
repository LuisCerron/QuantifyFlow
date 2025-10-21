'use client';

import {
  useEffect,
  useState,
  createContext,
  useContext,
  type ReactNode
} from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { type User as FirebaseUser, onAuthStateChanged } from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore';
import { auth, db } from '@/lib/firebase';
import type { User } from '@/types';

// 1. Se elimina 'logout' de la interfaz
interface AuthContextType {
  user: User | null;
  isLoading: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    const publicPaths = ['/login', '/register', '/forgot-password', '/onboarding'];
    const isPublicPath = publicPaths.some(path => pathname.startsWith(path));

    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser: FirebaseUser | null) => {
      try {
        if (firebaseUser) {
          const userDocRef = doc(db, "users", firebaseUser.uid);
          const userDoc = await getDoc(userDocRef);
          if (userDoc.exists()) {
            const userData = {
              uid: firebaseUser.uid,
              ...userDoc.data()
            } as User;
            setUser(userData);
          } else {
            console.warn("Usuario autenticado pero sin perfil completo en Firestore (probablemente en onboarding).");
            setUser({
              uid: firebaseUser.uid,
              email: firebaseUser.email,
              displayName: firebaseUser.displayName,
            } as User);
          }
        } else {

          setUser(null);
          if (!isPublicPath) {
            router.replace('/login');
          }
        }
      } catch (error) {
        console.error("Error en el estado de autenticación:", error);
        setUser(null);
      } finally {
        setIsLoading(false);
      }
    });

    return () => unsubscribe();
  }, [pathname, router]);

  // 4. Se elimina 'logout' del objeto 'value'
  const value = { user, isLoading };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth debe ser usado dentro de un AuthProvider');
  }
  return context;
}
