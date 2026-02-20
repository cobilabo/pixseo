'use client';

import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { useAuth } from './AuthContext';

interface DomainConfig {
  status: 'pending' | 'verifying' | 'active' | 'error';
}

interface PreviewAuth {
  enabled: boolean;
  username: string;
  password: string;
}

interface MediaTenant {
  id: string;
  name: string;
  slug: string;
  customDomain?: string;
  domainConfig?: DomainConfig;
  ownerId: string;
  memberIds: string[];
  clientId?: string;
  settings: {
    siteDescription: string;
    logos: {
      landscape: string;
      square: string;
      portrait: string;
    };
  };
  isActive: boolean;
  previewAuth?: PreviewAuth;
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

  const CACHE_TTL_MS = 5 * 60 * 1000; // 5分

  const getCachedTenants = (uid: string): MediaTenant[] | null => {
    try {
      const raw = sessionStorage.getItem(`tenants_${uid}`);
      if (!raw) return null;
      const { data, timestamp } = JSON.parse(raw);
      if (Date.now() - timestamp > CACHE_TTL_MS) {
        sessionStorage.removeItem(`tenants_${uid}`);
        return null;
      }
      return data;
    } catch {
      return null;
    }
  };

  const setCachedTenants = (uid: string, data: MediaTenant[]) => {
    sessionStorage.setItem(`tenants_${uid}`, JSON.stringify({ data, timestamp: Date.now() }));
  };

  const applyTenantSelection = (tenantList: MediaTenant[]) => {
    setTenants(tenantList);
    const storedTenantId = getStoredTenantId();
    if (storedTenantId) {
      const storedTenant = tenantList.find((t: MediaTenant) => t.id === storedTenantId);
      if (storedTenant) {
        setCurrentTenantState(storedTenant);
        setLoading(false);
        return;
      }
    }
    if (tenantList.length > 0) {
      setCurrentTenantState(tenantList[0]);
      storeTenantId(tenantList[0].id);
    }
    setLoading(false);
  };

  const fetchTenants = async () => {
    if (!user) {
      setTenants([]);
      setCurrentTenantState(null);
      setLoading(false);
      return;
    }

    const cached = getCachedTenants(user.uid);
    if (cached) {
      applyTenantSelection(cached);
      return;
    }

    try {
      const response = await fetch('/api/admin/service');
      if (response.ok) {
        const data = await response.json();
        const userTenants = data.filter((tenant: MediaTenant) => 
          tenant.ownerId === user.uid || tenant.memberIds.includes(user.uid)
        );
        setCachedTenants(user.uid, userTenants);
        applyTenantSelection(userTenants);
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
    // キャッシュをクリア
    if (user?.uid) {
      sessionStorage.removeItem(`tenants_${user.uid}`);
    }
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

