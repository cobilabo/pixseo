'use client';

import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { User as FirebaseUser } from 'firebase/auth';
import { onAuthStateChange } from '@/lib/firebase/auth';
import { UserRole } from '@/types/user';

interface AuthContextType {
  user: FirebaseUser | null;
  userRole: UserRole | null;
  loading: boolean;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  userRole: null,
  loading: true,
});

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

interface AuthProviderProps {
  children: ReactNode;
}

export const AuthProvider = ({ children }: AuthProviderProps) => {
  const [user, setUser] = useState<FirebaseUser | null>(null);
  const [userRole, setUserRole] = useState<UserRole | null>(null);
  const [loading, setLoading] = useState(true);
  const [initialized, setInitialized] = useState(false);

  useEffect(() => {
    console.log('[AuthProvider] Initializing auth state...');
    
    const unsubscribe = onAuthStateChange(async (firebaseUser) => {
      console.log('[AuthProvider] Auth state changed:', firebaseUser ? 'Logged in' : 'Not logged in');
      setUser(firebaseUser);
      
      // ユーザーのロール情報を取得
      if (firebaseUser) {
        try {
          const response = await fetch(`/api/admin/users/${firebaseUser.uid}`);
          if (response.ok) {
            const userData = await response.json();
            setUserRole(userData.role || 'admin');
          } else {
            // ユーザードキュメントが存在しない場合はデフォルトで admin
            setUserRole('admin');
          }
        } catch (error) {
          console.error('[AuthProvider] Error fetching user role:', error);
          setUserRole('admin');
        }
      } else {
        setUserRole(null);
      }
      
      // 初回ロード完了後は常に loading = false に保つ
      if (!initialized) {
        setInitialized(true);
        setLoading(false);
        console.log('[AuthProvider] Initial auth check complete');
      }
    });

    return () => unsubscribe();
  }, [initialized]);

  return (
    <AuthContext.Provider value={{ user, userRole, loading }}>
      {children}
    </AuthContext.Provider>
  );
};

