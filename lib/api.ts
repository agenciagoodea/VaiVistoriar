// Client de integração com o Backend cPanel do VaiVistoriar

const getApiUrl = () => {
  if (typeof window !== 'undefined') {
    // Se estiver rodando no mesmo servidor, usar rota relativa ou localhost no dev
    if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
      return 'http://localhost:3001/api';
    }
    return '/api';
  }
  return '/api';
};

const API_BASE = getApiUrl();

const getToken = () => localStorage.getItem('vaivistoriar_token');
const setToken = (token: string) => localStorage.setItem('vaivistoriar_token', token);
const removeToken = () => localStorage.removeItem('vaivistoriar_token');

export const authStateListeners: Array<(event: string, session: any) => void> = [];

export const apiFetch = async (endpoint: string, options: RequestInit = {}) => {
  const token = getToken();
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string> || {})
  };

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const res = await fetch(`${API_BASE}${endpoint}`, {
    ...options,
    headers
  });

  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(data.error || 'Erro na requisição');
  }
  return data;
};

// Interface que imita a API do Supabase client para manter compatibilidade total
export const customSupabaseClient = {
  auth: {
    async getSession() {
      const token = getToken();
      if (!token) return { data: { session: null }, error: null };
      try {
        const { user, profile } = await apiFetch('/auth/me');
        return {
          data: {
            session: {
              access_token: token,
              user: { ...user, user_metadata: { full_name: profile?.full_name, role: user.role } }
            }
          },
          error: null
        };
      } catch (err: any) {
        removeToken();
        return { data: { session: null }, error: err };
      }
    },
    async getUser() {
      try {
        const { user } = await apiFetch('/auth/me');
        return { data: { user }, error: null };
      } catch (err: any) {
        return { data: { user: null }, error: err };
      }
    },
    async signInWithPassword({ email, password }: any) {
      try {
        const res = await apiFetch('/auth/login', {
          method: 'POST',
          body: JSON.stringify({ email, password })
        });
        setToken(res.token);
        const session = { access_token: res.token, user: res.user };
        authStateListeners.forEach(cb => cb('SIGNED_IN', session));
        return { data: { session, user: res.user }, error: null };
      } catch (err: any) {
        return { data: { session: null, user: null }, error: err };
      }
    },
    async signUp({ email, password, options }: any) {
      try {
        const res = await apiFetch('/auth/register', {
          method: 'POST',
          body: JSON.stringify({
            email,
            password,
            full_name: options?.data?.full_name,
            role: options?.data?.role || 'BROKER'
          })
        });
        setToken(res.token);
        const session = { access_token: res.token, user: res.user };
        authStateListeners.forEach(cb => cb('SIGNED_IN', session));
        return { data: { session, user: res.user }, error: null };
      } catch (err: any) {
        return { data: { session: null, user: null }, error: err };
      }
    },
    async signOut() {
      removeToken();
      authStateListeners.forEach(cb => cb('SIGNED_OUT', null));
      return { error: null };
    },
    onAuthStateChange(callback: (event: string, session: any) => void) {
      authStateListeners.push(callback);
      // Disparar verificação inicial
      this.getSession().then(({ data }) => {
        if (data?.session) {
          callback('SIGNED_IN', data.session);
        }
      });
      return {
        data: {
          subscription: {
            unsubscribe: () => {
              const idx = authStateListeners.indexOf(callback);
              if (idx > -1) authStateListeners.splice(idx, 1);
            }
          }
        }
      };
    }
  },

  async rpc(fnName: string, params: any = {}) {
    try {
      if (fnName === 'get_email_by_cpf') {
        const cleanDoc = (params?.p_cpf_cnpj || '').replace(/\D/g, '');
        const res = await apiFetch(`/auth/lookup-email-by-cpf?cpf_cnpj=${encodeURIComponent(cleanDoc)}`);
        return { data: res?.email || null, error: null };
      }
      return { data: null, error: null };
    } catch (err: any) {
      return { data: null, error: err };
    }
  },

  from(table: string) {
    let endpoint = `/${table}`;

    return {
      select(columns = '*') {
        const self = this;
        let filters: Record<string, any> = {};

        const queryObj = {
          eq(column: string, value: any) {
            filters[column] = value;
            return this;
          },
          in(column: string, values: any[]) {
            filters[`${column}_in`] = values.join(',');
            return this;
          },
          order(column: string, opts?: any) {
            return this;
          },
          limit(count: number) {
            return this;
          },
          single() {
            return this.execute().then((res: any) => {
              const item = Array.isArray(res.data) ? res.data[0] : res.data;
              return { data: item || null, error: item ? null : new Error('Item não encontrado') };
            });
          },
          maybeSingle() {
            return this.execute().then((res: any) => {
              const item = Array.isArray(res.data) ? res.data[0] : res.data;
              return { data: item || null, error: null };
            });
          },
          then(resolve: any, reject?: any) {
            return this.execute().then(resolve, reject);
          },
          async execute() {
            try {
              let url = endpoint;
              if (Object.keys(filters).length > 0) {
                const params = new URLSearchParams(filters).toString();
                url += `?${params}`;
              }
              const data = await apiFetch(url);
              return { data, error: null };
            } catch (err: any) {
              return { data: null, error: err };
            }
          }
        };

        return queryObj;
      },

      insert(rows: any | any[]) {
        const payload = Array.isArray(rows) ? rows[0] : rows;
        return {
          async then(resolve: any, reject?: any) {
            try {
              const data = await apiFetch(endpoint, {
                method: 'POST',
                body: JSON.stringify(payload)
              });
              resolve({ data, error: null });
            } catch (err: any) {
              resolve({ data: null, error: err });
            }
          }
        };
      },

      update(values: any) {
        let filterId: string | null = null;
        return {
          eq(col: string, val: any) {
            if (col === 'id' || col === 'user_id' || col === 'key') filterId = val;
            return this;
          },
          async then(resolve: any, reject?: any) {
            try {
              let targetUrl = endpoint;
              if (filterId) {
                targetUrl += `/${filterId}`;
              }
              const data = await apiFetch(targetUrl, {
                method: 'PUT',
                body: JSON.stringify(values)
              });
              resolve({ data, error: null });
            } catch (err: any) {
              resolve({ data: null, error: err });
            }
          }
        };
      },

      upsert(values: any, opts?: any) {
        return {
          async then(resolve: any, reject?: any) {
            try {
              const data = await apiFetch(`${endpoint}/upsert`, {
                method: 'POST',
                body: JSON.stringify(values)
              });
              resolve({ data, error: null });
            } catch (err: any) {
              resolve({ data: null, error: err });
            }
          }
        };
      },

      delete() {
        let filterId: string | null = null;
        return {
          eq(col: string, val: any) {
            filterId = val;
            return this;
          },
          async then(resolve: any, reject?: any) {
            try {
              const data = await apiFetch(`${endpoint}/${filterId}`, {
                method: 'DELETE'
              });
              resolve({ data, error: null });
            } catch (err: any) {
              resolve({ data: null, error: err });
            }
          }
        };
      }
    };
  },

  storage: {
    from(bucket: string) {
      return {
        async upload(filePath: string, file: File | Blob | any) {
          try {
            let base64 = file;
            if (file instanceof Blob || file instanceof File) {
              base64 = await new Promise((resolve, reject) => {
                const reader = new FileReader();
                reader.onloadend = () => resolve(reader.result);
                reader.onerror = reject;
                reader.readAsDataURL(file);
              });
            }

            const res = await apiFetch('/upload', {
              method: 'POST',
              body: JSON.stringify({
                file: base64,
                fileName: filePath || file.name || 'upload.png',
                bucket
              })
            });

            return { data: { path: res.publicUrl }, error: null };
          } catch (err: any) {
            return { data: null, error: err };
          }
        },
        getPublicUrl(filePath: string) {
          const publicUrl = filePath.startsWith('/') || filePath.startsWith('http')
            ? filePath
            : `/uploads/${filePath}`;
          return { data: { publicUrl } };
        }
      };
    }
  },

  functions: {

    async invoke(functionName: string, options?: { body?: any }) {
      try {
        let endpoint = `/admin/${functionName}`;
        if (functionName === 'admin-dash') {
          const action = options?.body?.action || 'metrics';
          if (action === 'get_metrics') endpoint = '/admin/metrics';
          else if (action === 'get_users' || action === 'list_users') endpoint = '/admin/users';
          else endpoint = '/admin/metrics';
        } else if (functionName === 'send-email') {
          endpoint = '/email/send';
        } else if (functionName === 'send-invite') {
          endpoint = '/email/send-invite';
        } else if (functionName === 'mercadopago-api') {
          endpoint = '/mercadopago/create-preference';
        }

        const data = await apiFetch(endpoint, {
          method: 'POST',
          body: JSON.stringify(options?.body || {})
        });

        return { data, error: null };
      } catch (err: any) {
        return { data: null, error: err };
      }
    }
  }
};
