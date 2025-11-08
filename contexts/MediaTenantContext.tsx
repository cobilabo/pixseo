'use client';

import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { useAuth } from './AuthContext';

interface MediaTenant {
  id: string;
  name: string;
  slug: string;
  customDomain?: string;
  subdomain?: string;
  ownerId: string;
  memberIds: string[];
  settings: {
    siteName: string;
    siteDescription: string;
    logoUrl: string;
  };
  isActive: boolean;
}

interface MediaTenantContextType {
  currentTenant: MediaTenant | null;
  tenants: MediaTenant[];
  loading: boolean;
  setCurrentTenant: (tenant: MediaTenant | null) => void;
  refreshTenants: () => Promise<void>;
}

const MediaTenantContext = createContext<MediaTenantContextType>({
  currentTenant: null,
  tenants: [],
  loading: true,
  setCurrentTenant: () => {},
  refreshTenants: async () => {},
});

export const useMediaTenant = () => useContext(MediaTenantContext);

export function MediaTenantProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const [currentTenant, setCurrentTenantState] = useState<MediaTenant | null>(null);
  const [tenants, setTenants] = useState<MediaTenant[]>([]);
  const [loading, setLoading] = useState(true);

  // ローカルストレージから保存されたテナントIDを取得
  const getStoredTenantId = (): string | null => {
    if (typeof window === 'undefined') return null;
    return localStorage.getItem('currentTenantId');
  };

  // ローカルストレージにテナントIDを保存
  const storeTenantId = (tenantId: string | null) => {
    if (typeof window === 'undefined') return;
    if (tenantId) {
      localStorage.setItem('currentTenantId', tenantId);
    } else {
      localStorage.removeItem('currentTenantId');
    }
  };

  // テナント一覧を取得
  const fetchTenants = async () => {
    if (!user) {
      setTenants([]);
      setCurrentTenantState(null);
      setLoading(false);
      return;
    }

    try {
      const response = await fetch('/api/admin/service');
      if (response.ok) {
        const data = await response.json();
        
        // 現在のユーザーが所属しているテナントのみフィルタ
        const userTenants = data.filter((tenant: MediaTenant) => 
          tenant.ownerId === user.uid || tenant.memberIds.includes(user.uid)
        );
        
        setTenants(userTenants);

        // 保存されたテナントIDがあれば復元
        const storedTenantId = getStoredTenantId();
        if (storedTenantId) {
          const storedTenant = userTenants.find((t: MediaTenant) => t.id === storedTenantId);
          if (storedTenant) {
            setCurrentTenantState(storedTenant);
            setLoading(false);
            return;
          }
        }

        // 最初のテナントを自動選択
        if (userTenants.length > 0) {
          setCurrentTenantState(userTenants[0]);
          storeTenantId(userTenants[0].id);
        }
      }
    } catch (error) {
      console.error('Error fetching tenants:', error);
    } finally {
      setLoading(false);
    }
  };

  const setCurrentTenant = (tenant: MediaTenant | null) => {
    setCurrentTenantState(tenant);
    storeTenantId(tenant?.id || null);
  };

  const refreshTenants = async () => {
    await fetchTenants();
  };

  useEffect(() => {
    fetchTenants();
  }, [user]);

  return (
    <MediaTenantContext.Provider 
      value={{ 
        currentTenant, 
        tenants, 
        loading, 
        setCurrentTenant,
        refreshTenants,
      }}
    >
      {children}
    </MediaTenantContext.Provider>
  );
}

