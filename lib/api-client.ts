/**
 * 管理画面用のAPI Client
 * 現在選択中のmediaIdを自動的にリクエストヘッダーに追加します
 */

// mediaIdをヘッダーに追加するfetch wrapper
export async function fetchWithMediaId(url: string, options: RequestInit = {}): Promise<Response> {
  // LocalStorageから現在のmediaIdを取得
  const currentTenantId = typeof window !== 'undefined' 
    ? localStorage.getItem('currentTenantId') 
    : null;

  const headers = new Headers(options.headers || {});
  
  // mediaIdをヘッダーに追加
  if (currentTenantId) {
    headers.set('x-media-id', currentTenantId);
  }

  return fetch(url, {
    ...options,
    headers,
  });
}

// GET リクエスト用のヘルパー
export async function apiGet<T = any>(url: string): Promise<T> {
  const response = await fetchWithMediaId(url);
  
  if (!response.ok) {
    throw new Error(`API Error: ${response.status} ${response.statusText}`);
  }
  
  return response.json();
}

// POST リクエスト用のヘルパー
export async function apiPost<T = any>(url: string, data: any): Promise<T> {
  const response = await fetchWithMediaId(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(data),
  });
  
  if (!response.ok) {
    throw new Error(`API Error: ${response.status} ${response.statusText}`);
  }
  
  return response.json();
}

// PUT リクエスト用のヘルパー
export async function apiPut<T = any>(url: string, data: any): Promise<T> {
  const response = await fetchWithMediaId(url, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(data),
  });
  
  if (!response.ok) {
    throw new Error(`API Error: ${response.status} ${response.statusText}`);
  }
  
  return response.json();
}

// DELETE リクエスト用のヘルパー
export async function apiDelete<T = any>(url: string): Promise<T> {
  const response = await fetchWithMediaId(url, {
    method: 'DELETE',
  });
  
  if (!response.ok) {
    throw new Error(`API Error: ${response.status} ${response.statusText}`);
  }
  
  return response.json();
}

// FormData用のPOST（画像アップロードなど）
export async function apiPostFormData<T = any>(url: string, formData: FormData): Promise<T> {
  // LocalStorageから現在のmediaIdを取得してFormDataに追加
  const currentTenantId = typeof window !== 'undefined' 
    ? localStorage.getItem('currentTenantId') 
    : null;

  if (currentTenantId) {
    formData.append('mediaId', currentTenantId);
  }

  const response = await fetch(url, {
    method: 'POST',
    body: formData,
  });
  
  if (!response.ok) {
    throw new Error(`API Error: ${response.status} ${response.statusText}`);
  }
  
  return response.json();
}

// apiClientオブジェクトとしてもエクスポート
export const apiClient = {
  get: async (url: string, options?: RequestInit) => {
    return fetchWithMediaId(url, { ...options, method: 'GET' });
  },
  post: async (url: string, data: any) => {
    return fetchWithMediaId(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
  },
  put: async (url: string, data: any) => {
    return fetchWithMediaId(url, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
  },
  delete: async (url: string) => {
    return fetchWithMediaId(url, { method: 'DELETE' });
  },
};

