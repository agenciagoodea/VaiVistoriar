// Client de integração com o Backend cPanel do VaiVistoriar

const getApiUrl = () => {
  if (typeof window !== 'undefined') {
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

  functions: {
    async invoke(functionName: string, options: any = {}) {
      try {
        const bodyData = options?.body || {};
        const res = await apiFetch(`/functions/${functionName}`, {
          method: 'POST',
          headers: options?.headers || {},
          body: JSON.stringify(bodyData)
        });
        return { data: res, error: null };
      } catch (err: any) {
        console.error(`Erro ao chamar function ${functionName}:`, err);
        return { data: null, error: err };
      }
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

  channel(name: string) {
    return {
      on(event: string, opts: any, callback: any) {
        return this;
      },
      subscribe(callback?: any) {
        if (callback) callback('SUBSCRIBED');
        return this;
      },
      unsubscribe() {
        return this;
      }
    };
  },
  removeChannel(channel: any) {
    return this;
  },
  removeAllChannels() {
    return this;
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
          neq(column: string, value: any) {
            filters[`${column}_neq`] = value;
            return this;
          },
          gt(column: string, value: any) {
            filters[`${column}_gt`] = value;
            return this;
          },
          gte(column: string, value: any) {
            filters[`${column}_gte`] = value;
            return this;
          },
          lt(column: string, value: any) {
            filters[`${column}_lt`] = value;
            return this;
          },
          lte(column: string, value: any) {
            filters[`${column}_lte`] = value;
            return this;
          },
          in(column: string, values: any[]) {
            filters[`${column}_in`] = Array.isArray(values) ? values.join(',') : values;
            return this;
          },
          is(column: string, value: any) {
            filters[`${column}_is`] = value;
            return this;
          },
          not(column: string, operator: string, value: any) {
            return this;
          },
          or(filtersStr: string) {
            return this;
          },
          like(column: string, pattern: string) {
            filters[`${column}_like`] = pattern;
            return this;
          },
          ilike(column: string, pattern: string) {
            filters[`${column}_ilike`] = pattern;
            return this;
          },
          contains(column: string, val: any) {
            return this;
          },
          order(column: string, opts?: any) {
            return this;
          },
          limit(count: number) {
            return this;
          },
          range(from: number, to: number) {
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
            let url = endpoint;
            const queryParams = new URLSearchParams();

            Object.entries(filters).forEach(([k, v]) => {
              if (v !== undefined && v !== null) {
                queryParams.append(k, String(v));
              }
            });

            const qStr = queryParams.toString();
            if (qStr) {
              url += (url.includes('?') ? '&' : '?') + qStr;
            }

            try {
              const data = await apiFetch(url);
              return { data, error: null };
            } catch (err: any) {
              return { data: null, error: err };
            }
          }
        };

        return queryObj;
      },

      insert(values: any | any[]) {
        const payload = Array.isArray(values) ? values[0] : values;
        return {
          async select() {
            try {
              const data = await apiFetch(endpoint, {
                method: 'POST',
                body: JSON.stringify(payload)
              });
              return { data: [data], error: null };
            } catch (err: any) {
              return { data: null, error: err };
            }
          },
          then(resolve: any, reject?: any) {
            return apiFetch(endpoint, {
              method: 'POST',
              body: JSON.stringify(payload)
            }).then(data => resolve({ data, error: null })).catch(err => resolve({ data: null, error: err }));
          }
        };
      },

      upsert(values: any | any[]) {
        const payload = Array.isArray(values) ? values : [values];
        return {
          async select() {
            try {
              const data = await apiFetch(endpoint, {
                method: 'POST',
                body: JSON.stringify(payload)
              });
              return { data: Array.isArray(data) ? data : [data], error: null };
            } catch (err: any) {
              return { data: null, error: err };
            }
          },
          then(resolve: any, reject?: any) {
            return apiFetch(endpoint, {
              method: 'POST',
              body: JSON.stringify(payload)
            }).then(data => resolve({ data, error: null })).catch(err => resolve({ data: null, error: err }));
          }
        };
      },

      update(values: any) {
        let filters: Record<string, any> = {};
        return {
          eq(column: string, value: any) {
            filters[column] = value;
            return this;
          },
          neq(column: string, value: any) {
            filters[`${column}_neq`] = value;
            return this;
          },
          async execute() {
            const targetId = filters['id'] || filters['user_id'];
            let url = endpoint;
            if (targetId) {
              url += `/${targetId}`;
            }
            try {
              const data = await apiFetch(url, {
                method: 'PUT',
                body: JSON.stringify(values)
              });
              return { data, error: null };
            } catch (err: any) {
              return { data: null, error: err };
            }
          },
          then(resolve: any, reject?: any) {
            return this.execute().then(resolve, reject);
          }
        };
      },

      delete() {
        let filters: Record<string, any> = {};
        return {
          eq(column: string, value: any) {
            filters[column] = value;
            return this;
          },
          async execute() {
            const targetId = filters['id'] || filters['user_id'];
            let url = endpoint;
            if (targetId) {
              url += `/${targetId}`;
            }
            try {
              const data = await apiFetch(url, {
                method: 'DELETE'
              });
              return { data, error: null };
            } catch (err: any) {
              return { data: null, error: err };
            }
          },
          then(resolve: any, reject?: any) {
            return this.execute().then(resolve, reject);
          }
        };
      }
    };
  }
};
