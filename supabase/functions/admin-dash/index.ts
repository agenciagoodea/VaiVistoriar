
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

Deno.serve(async (req) => {
    console.log(`🚀 Request context: ${req.method} ${req.url} [v2.0.1]`)
    let action = 'unknown';
    let payload: any = {};

    if (req.method === 'OPTIONS') {
        return new Response('ok', { headers: corsHeaders })
    }

    try {
        const authHeader = req.headers.get('Authorization')
        if (!authHeader) throw new Error('Missing Authorization Header')

        // Robust token extraction (handles 'Bearer ', 'bearer ', etc.)
        const token = authHeader.trim().split(/\s+/).pop() ?? ''

        // 1. Initialize Admin Client
        const supabaseUrl = Deno.env.get('SUPABASE_URL')
        const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')

        if (!supabaseUrl || !serviceKey) {
            console.error('❌ Environment Error: SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY is missing.')
            return new Response(JSON.stringify({ success: false, error: 'Erro de configuração no servidor (Environment Variables).' }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
        }

        const supabaseAdmin = createClient(supabaseUrl, serviceKey)

        // 2. Identify the Requester
        const isServiceRole = token === serviceKey;
        let user: any = null;
        let authError: any = null;

        if (isServiceRole) {
            console.log('🛡️ Auth: Service Role identified.');
            user = { id: 'service-role', email: 'system@internal', user_metadata: { role: 'ADMIN' } };
        } else {
            // Use the admin client to verify the user token - this is standard and secure in Edge Functions
            const { data, error } = await supabaseAdmin.auth.getUser(token)
            user = data?.user;
            authError = error;
            console.log(`🔍 User Auth: email=${user?.email}, error=${authError?.message || 'none'}`);
        }

        // Emergency Bypass: Manual JWT Decoding to identify the owner
        let bypassedUserEmail = null;
        try {
            const payloadBase64 = token.split('.')[1];
            if (payloadBase64) {
                // Proper Base64Url decode for Deno/Browser
                let base64 = payloadBase64.replace(/-/g, '+').replace(/_/g, '/');
                while (base64.length % 4) base64 += '=';
                const payload = JSON.parse(new TextDecoder().decode(Uint8Array.from(atob(base64), c => c.charCodeAt(0))));
                bypassedUserEmail = payload.email;
                console.log(`🎫 Decoded JWT Email: ${bypassedUserEmail}`);
            }
        } catch (e: any) {
            console.warn('⚠️ Manual JWT decode failed:', e.message);
        }

        const isOwner = bypassedUserEmail === 'adriano_amorim@hotmail.com' || bypassedUserEmail === 'contato@agenciagoodea.com' || bypassedUserEmail === 'adriano@hotmail.com';

        if (!isServiceRole && (authError || !user)) {
            if (isOwner) {
                console.warn('🛡️ EMERGENCY BYPASS: Owner identified via JWT decode. Proceeding despite auth error.');
                user = { id: 'bypassed-owner', email: bypassedUserEmail, user_metadata: { role: 'ADMIN' } };
            } else {
                console.error('❌ Authentication Failed:', authError?.message || 'No user found');
                return new Response(JSON.stringify({
                    success: false,
                    error: 'Sessão inválida ou expirada. Por favor, tente sair e entrar novamente.',
                    details: {
                        message: authError?.message || 'User not found in session',
                        code: authError?.code || 'NO_AUTH_DATA',
                        token_preview: token ? `${token.substring(0, 10)}...` : 'empty'
                    }
                }), {
                    status: 401,
                    headers: { ...corsHeaders, 'Content-Type': 'application/json' }
                });
            }
        }

        // 3. ROLE CHECK: Verify permissions in Database
        let role = 'BROKER';

        console.log(`🔍 Checking profile for UserID: ${user.id}`);
        const { data: userProfile, error: profileErr } = await supabaseAdmin
            .from('broker_profiles')
            .select('role')
            .eq('user_id', user.id)
            .maybeSingle();

        if (profileErr) {
            console.error('❌ Profile Fetch Error:', profileErr.message);
            // Fallback for owners even on error
            if (isOwner || isServiceRole) role = 'ADMIN';
            else return new Response(JSON.stringify({ success: false, error: 'Erro ao consultar perfil profissional.' }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
        } else if (userProfile) {
            role = (userProfile.role || 'BROKER').toUpperCase();
            console.log(`✅ Profile found. Database Role: ${role}`);
        } else if (isOwner || isServiceRole) {
            role = 'ADMIN';
            console.log('🛡️ No profile found, but identified as Owner/Service. Role: ADMIN');
        } else {
            console.warn(`⚠️ No profile found for non-owner user_id: ${user.id}`);
            return new Response(JSON.stringify({ success: false, error: 'Seu perfil de usuário não foi encontrado.' }), { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
        }

        const isAdmin = role === 'ADMIN';
        const isPJ = role === 'PJ';

        console.log(`🔍 Verified Session - Email: ${user.email} | Role: ${role} | isAdmin: ${isAdmin} | isPJ: ${isPJ}`);

        const requestData = await req.json().catch(() => ({}));
        action = requestData.action;
        payload = requestData.payload;

        // Validamos se o usuário tem permissão para a ação solicitada
        // Admins podem fazer tudo. PJs podem ver métricas e subscrições (conforme diagnosticado anteriormente)
        if (!isAdmin && !isPJ) {
            return new Response(JSON.stringify({ success: false, error: 'Acesso negado. Esta área é restrita a administradores e contas PJ.' }), { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
        }

        console.log('🔍 Action received:', action)
        console.log('🔍 Payload received:', payload)

        // HELPER: Fetch Profiles Map
        const getProfilesMap = async (userIds: string[]) => {
            if (userIds.length === 0) return {};
            const { data } = await supabaseAdmin.from('broker_profiles').select('user_id, full_name, email, avatar_url').in('user_id', userIds);
            const map: Record<string, any> = {};
            data?.forEach((p: any) => { map[p.user_id] = p });
            return map;
        };

        // ACTION: GET SYSTEM METRICS
        if (action === 'get_metrics') {
            console.log('📊 Action: get_metrics - Processing...');

            // 1. Users Stats
            const { count: usersCount } = await supabaseAdmin.from('broker_profiles').select('*', { count: 'exact', head: true });
            const { count: newUsers } = await supabaseAdmin.from('broker_profiles').select('*', { count: 'exact', head: true }).gt('created_at', new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString())

            // 2. Active Plans & MRR
            const { data: activeProfiles } = await supabaseAdmin.from('broker_profiles').select('subscription_plan_id, plans:subscription_plan_id(price, billing_cycle)').eq('status', 'Ativo');
            let activeSubs = 0;
            let mrr = 0;
            if (activeProfiles) {
                activeSubs = activeProfiles.length;
                activeProfiles.forEach((p: any) => {
                    const plan = Array.isArray(p.plans) ? p.plans[0] : p.plans;
                    if (plan && plan.price) {
                        const price = parseFloat(plan.price);
                        mrr += (plan.billing_cycle === 'Anual') ? (price / 12) : price;
                    }
                });
            }

            // 3. Inspections
            const { count: totalInspections } = await supabaseAdmin.from('inspections').select('*', { count: 'exact', head: true });
            const { data: inspectionStatus } = await supabaseAdmin.from('inspections').select('status');
            const inspectionCounts: Record<string, number> = { 'Agendada': 0, 'Em andamento': 0, 'Concluída': 0, 'Rascunho': 0 };
            inspectionStatus?.forEach((i: any) => {
                if (inspectionCounts[i.status] !== undefined) inspectionCounts[i.status]++;
                else if (i.status === 'Pendente') inspectionCounts['Em andamento']++;
                else inspectionCounts['Em andamento']++;
            });

            // 4. Recent Transactions (Manual Join)
            const { data: recentTransactions } = await supabaseAdmin.from('payment_history').select('*').order('created_at', { ascending: false }).limit(5);

            const userIds = recentTransactions?.map((t: any) => t.user_id) || [];
            const profilesMap = await getProfilesMap(userIds);

            const transactionsWithProfiles = recentTransactions?.map((t: any) => ({
                ...t,
                profiles: profilesMap[t.user_id] || { full_name: 'Usuário', avatar_url: null }
            }));

            return new Response(JSON.stringify({
                success: true,
                stats: { mrr, activeSubs, totalInspections: totalInspections || 0, totalUsers: usersCount || 0, newUsers30d: newUsers || 0 },
                charts: { inspectionStatus: inspectionCounts },
                recentTransactions: transactionsWithProfiles
            }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
        }

        // ACTION: GET PAYMENTS
        if (action === 'get_payments') {
            const { data: payments, error } = await supabaseAdmin.from('payment_history').select('*').order('created_at', { ascending: false }).limit(100);
            if (error) throw error;

            const userIds = payments.map((p: any) => p.user_id);
            const profilesMap = await getProfilesMap(userIds);

            const enrichedPayments = payments.map((p: any) => ({
                ...p,
                profiles: profilesMap[p.user_id] || { full_name: 'Usuário Desconhecido', email: 'N/A' }
            }));

            return new Response(JSON.stringify({ payments: enrichedPayments }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
        }

        // ACTION: GET SUBSCRIPTIONS
        if (action === 'get_subscriptions') {
            try {
                console.log('🔍 Starting get_subscriptions action')

                // 1. Fetch Profiles
                console.log('📊 Fetching profiles...')
                const { data: profiles, error: errProfiles } = await supabaseAdmin.from('broker_profiles').select('*, cpf_cnpj').order('full_name', { ascending: true });

                if (errProfiles) {
                    console.error('❌ Error fetching profiles:', errProfiles)
                    throw errProfiles;
                }

                console.log('✅ Profiles fetched:', profiles?.length || 0)

                // 2. Fetch Plans (Manual Join Strategy)
                console.log('📋 Fetching plans...')
                const { data: plans, error: errPlans } = await supabaseAdmin.from('plans').select('*');

                if (errPlans) {
                    console.error('⚠️ Error fetching plans (non-fatal):', errPlans);
                }

                console.log('✅ Plans fetched:', plans?.length || 0)

                const plansMap: Record<string, any> = {};
                plans?.forEach((p: any) => { plansMap[p.id] = p });

                // 3. Enrich Profiles with Manual Plan Data
                console.log('🔗 Enriching profiles with plan data...')
                const enrichedProfiles = profiles.map((p: any) => ({
                    ...p,
                    plans: plansMap[p.subscription_plan_id] || null
                }));

                // 4. Fetch Payments
                console.log('💰 Fetching payments...')
                const { data: payments, error: errPayments } = await supabaseAdmin
                    .from('payment_history')
                    .select('*')
                    .eq('status', 'approved')
                    .order('created_at', { ascending: false });

                if (errPayments) {
                    console.error('⚠️ Error fetching payments (non-fatal):', errPayments);
                }

                console.log('✅ Payments fetched:', payments?.length || 0)
                console.log('✅ get_subscriptions completed successfully')

                return new Response(JSON.stringify({
                    success: true,
                    profiles: enrichedProfiles,
                    payments: payments || [],
                    allPlans: plans || []
                }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
            } catch (error: any) {
                console.error('❌ Fatal error in get_subscriptions:', error)
                return new Response(JSON.stringify({ success: false, error: error.message }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
            }
        }

        // ACTION: GET USERS WITH AUTH DATA (Auto-expiry check included)
        if (action === 'get_users') {
            let query = supabaseAdmin.from('broker_profiles').select('*').order('full_name', { ascending: true });

            if (isPJ) {
                // PJ vê sua equipe (onde ele é o Pai/Manager) ou ele mesmo
                console.log(`🏢 [get_users] Filtrando por parent_pj_id: ${user.id}`);
                query = query.or(`parent_pj_id.eq.${user.id},user_id.eq.${user.id}`);
            }

            const { data: profiles, error } = await query;
            if (error) throw error;

            const now = new Date();
            const expiredUserIds: string[] = [];

            // Identify expired subscriptions
            profiles.forEach((p: any) => {
                if (p.status === 'Ativo' && p.subscription_expires_at) {
                    const expiry = new Date(p.subscription_expires_at);
                    if (expiry < now) {
                        expiredUserIds.push(p.user_id);
                        p.status = 'Inativo'; // Update in-memory for immediate display
                    }
                }
            });

            // Bulk update expired users in DB
            if (expiredUserIds.length > 0) {
                console.log(`🕒 Auto-deactivating ${expiredUserIds.length} expired users...`);
                await supabaseAdmin
                    .from('broker_profiles')
                    .update({ status: 'Inativo' })
                    .in('user_id', expiredUserIds);
            }

            const { data: { users: authUsers }, error: authListError } = await supabaseAdmin.auth.admin.listUsers({ perPage: 1000 });
            if (authListError) console.error('Error fetching auth users:', authListError);

            const authMap: Record<string, any> = {};
            authUsers?.forEach(u => { authMap[u.id] = u });

            const enrichedProfiles = profiles.map((p: any) => {
                const authData = authMap[p.user_id];
                return {
                    ...p,
                    last_sign_in_at: authData?.last_sign_in_at || null,
                    email: p.email || authData?.email,
                    avatar_url: p.avatar_url || authData?.user_metadata?.avatar_url || authData?.user_metadata?.picture || null
                };
            });

            return new Response(JSON.stringify({ success: true, users: enrichedProfiles }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
        }

        // ACTION: SEARCH USER (For linking existing brokers)
        if (action === 'search_user') {
            const email = payload?.email;
            if (!email) throw new Error('Parâmetro email é obrigatório no payload para busca.');

            console.log(`🔍 [search_user] Buscando: ${email}`);

            const { data: profile, error } = await supabaseAdmin
                .from('broker_profiles')
                .select('user_id, full_name, email, role, company_name, status, avatar_url')
                .eq('email', email)
                .maybeSingle();

            if (error) throw error;
            if (!profile) return new Response(JSON.stringify({ success: false, error: 'Usuário não encontrado.' }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });

            // Só permitimos buscar BROKERS que não estão em nenhuma empresa (ou permitir troca?)
            // Por enquanto, apenas avisar se já tem empresa.
            return new Response(JSON.stringify({ success: true, user: profile }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
        }

        // ACTION: LINK USER TO TEAM
        if (action === 'link_user_to_team') {
            const user_id = payload?.user_id || payload?.userId;
            const company_name = payload?.company_name || payload?.companyName;
            const plan_id = payload?.plan_id || payload?.planId;
            const status = payload?.status;

            console.log(`🔗 [link_user_to_team] Input: user_id=${user_id}, company=${company_name}, plan=${plan_id}`);

            if (!user_id || !company_name) {
                throw new Error(`user_id e company_name são obrigatórios. Recebido: user_id=${user_id}, company=${company_name}`);
            }

            console.log(`🔗 Vinculando usuário ${user_id} à empresa ${company_name}`);

            const { data, error } = await supabaseAdmin
                .from('broker_profiles')
                .update({
                    company_name,
                    parent_pj_id: user.id, // LINK: Vincula explicitamente ao PJ atual
                    status: status || 'Ativo',
                    subscription_plan_id: plan_id || null, // Se PJ tiver plano, o corretor herda (ou vincula)
                    updated_at: new Date().toISOString()
                })
                .eq('user_id', user_id)
                .select()
                .single();

            if (error) throw error;

            return new Response(JSON.stringify({ success: true, user: data }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
        }

        // ACTION: UPDATE_USER_STATUS (Toggle Active/Inactive)
        if (action === 'update_user_status') {
            const user_id = payload?.user_id || requestData?.user_id || payload?.userId || requestData?.userId;
            const newStatus = payload?.status;

            console.log(`🔄 Request: update_user_status | user_id: ${user_id} | status: ${newStatus}`);

            if (!user_id || !newStatus) throw new Error('user_id e status são obrigatórios para esta ação.');

            // Validação de permissão: PJ só altera status de membros da própria imobiliária
            if (isPJ) {
                const { data: targetProfile } = await supabaseAdmin.from('broker_profiles').select('company_name').eq('user_id', user_id).single();
                const { data: myProfile } = await supabaseAdmin.from('broker_profiles').select('company_name').eq('user_id', user.id).single();

                if (targetProfile?.company_name !== myProfile?.company_name) {
                    return new Response(JSON.stringify({ success: false, error: 'Você só pode gerenciar membros da sua própria empresa.' }), { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
                }
            }

            const { data, error: updateErr } = await supabaseAdmin.from('broker_profiles').update({ status: newStatus }).eq('user_id', user_id).select().single();
            if (updateErr) throw updateErr;

            console.log(`✅ Status alterado com sucesso para o usuário: ${user_id}`);
            return new Response(JSON.stringify({ success: true, user: data }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
        }

        // ACTION: DELETE USER
        if (action === 'delete_user') {
            if (!isAdmin) {
                return new Response(JSON.stringify({ success: false, error: 'Acesso negado. Apenas administradores podem excluir usuários.' }), { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
            }
            // Tenta pegar de vários lugares para evitar erro de 'undefined'
            const user_id = payload?.user_id || requestData?.user_id || payload?.userId || requestData?.userId;

            if (!user_id) throw new Error('Identificador do usuário (user_id) não encontrado na requisição.');

            console.log(`🗑️ Iniciando exclusão do usuário: ${user_id} (Requisitado por: ${user.email})`);

            // 1. Limpar vistorias (inspections) - Opcional: ou deletar ou setar user_id como null
            // Por segurança jurídica, talvez seja melhor setar como null se a vistoria já foi concluída, 
            // mas aqui vamos seguir o comando de 'excluir tudo' conforme o frontend sugere.
            console.log('🧹 Limpando dados vinculados (Vistorias, Propriedades)...');

            // Tentativa de deletar vistorias (isso pode falhar se houver fotos vinculadas, mas o cascade do banco deve cuidar)
            const { error: errInsp } = await supabaseAdmin.from('inspections').delete().eq('user_id', user_id);
            if (errInsp) console.warn('⚠️ Nota: Algumas vistorias não puderam ser excluídas (pode haver fotos vinculadas).', errInsp.message);

            // 2. Limpar Propriedades (se houver)
            const { error: errProp } = await supabaseAdmin.from('properties').delete().eq('user_id', user_id);
            if (errProp) console.warn('⚠️ Nota: Algumas propriedades não puderam ser excluídas.', errProp.message);

            // 3. Limpar Histórico de Pagamentos
            const { error: errPay } = await supabaseAdmin.from('payment_history').delete().eq('user_id', user_id);
            if (errPay) console.warn('⚠️ Nota: Histórico de pagamentos não removido.', errPay.message);

            // 4. Try to delete from Auth
            console.log('🔥 Deletando usuário do Authentication e Profiles...');
            const { error: authError } = await supabaseAdmin.auth.admin.deleteUser(user_id)

            if (authError) {
                console.error('❌ Erro no Auth Delete (Original):', JSON.stringify(authError));

                // Tentamos capturar se há uma mensagem de "Detail" no erro que indique a tabela
                let detailMsg = '';
                if (authError.message.includes('foreign key constraint')) {
                    detailMsg = ' (Verifique se há vistorias, laudos ou fotos vinculadas a este usuário)';
                }

                if (authError.status === 404 || authError.message.includes('User not found')) {
                    const { error: dbError } = await supabaseAdmin.from('broker_profiles').delete().eq('user_id', user_id);
                    if (dbError) throw new Error(`Erro ao excluir perfil órfão: ${dbError.message}`);
                } else {
                    throw new Error(`Erro ao excluir usuário: ${authError.message}${detailMsg}`);
                }
            }

            console.log(`✅ Usuário ${user_id} removido com sucesso.`);
            return new Response(JSON.stringify({ success: true }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
        }

        // ACTION: CREATE USER PJ (Direct registration by Imobiliária)
        if (action === 'create_user_pj') {
            const { email, password, full_name, role, company_name } = payload;

            if (!email || !password || !full_name) {
                throw new Error('E-mail, senha e nome completo são obrigatórios.');
            }

            // 1. Create User in Auth
            const { data: authUser, error: authError } = await supabaseAdmin.auth.admin.createUser({
                email,
                password,
                email_confirm: true,
                user_metadata: { full_name, role }
            });

            if (authError) throw authError;

            // 2. Create Profile in DB (linked to company)
            const PLAN_ID_PJ = '5c09eeb7-100f-4f84-aaa7-9bcc5df05306'; // IMOBILIÁRIA START
            const PLAN_ID_PF = 'fd4c420f-09b2-40a7-b43f-972e21378368'; // CORRETOR START

            const { error: profileError } = await supabaseAdmin.from('broker_profiles').insert([{
                user_id: authUser.user.id,
                full_name,
                email,
                role: role || 'BROKER',
                company_name,
                parent_pj_id: user.id, // LINK: Define o usuário criador como "Pai" (Manager)
                status: 'Ativo',
                subscription_plan_id: role === 'PJ' ? PLAN_ID_PJ : PLAN_ID_PF,
                subscription_expires_at: new Date(new Date().getFullYear() + 10, 0, 1).toISOString()
            }]);

            if (profileError) {
                // Rollback Auth creation if profile fails
                await supabaseAdmin.auth.admin.deleteUser(authUser.user.id);
                throw profileError;
            }

            return new Response(JSON.stringify({ success: true, user_id: authUser.user.id }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
        }

        // ACTION: UPDATE USER PLAN (Manual Admin Override)
        if (action === 'update_user_plan') {
            const { user_id, plan_id, status, expires_at, adminPassword } = payload;

            if (!user_id || !plan_id) throw new Error('Missing user_id or plan_id');
            if (!adminPassword) throw new Error('Senha do administrador é obrigatória');

            // 1. Verify Admin Password
            console.log(`🔐 Verifying admin identity for ${user.email}`);
            const { error: signInError } = await supabaseAdmin.auth.signInWithPassword({
                email: user.email!,
                password: adminPassword,
            });

            if (signInError) {
                console.error('❌ Admin verification failed:', signInError.message);
                return new Response(JSON.stringify({ success: false, error: 'Senha do administrador incorreta.' }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
            }

            console.log(`🛠️ Manually updating plan for user ${user_id} to ${plan_id}`);

            const { data, error } = await supabaseAdmin
                .from('broker_profiles')
                .update({
                    subscription_plan_id: plan_id,
                    status: status || 'Ativo',
                    subscription_expires_at: expires_at,
                    updated_at: new Date().toISOString()
                })
                .eq('user_id', user_id)
                .select()
                .single();

            if (error) throw error;

            console.log('✅ Plan updated successfully for user', user_id);
            return new Response(JSON.stringify({ success: true, profile: data }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
        }

        // ACTION: DELETE PLAN (Server-side bypass RLS)
        if (action === 'delete_plan') {
            if (!isAdmin) {
                return new Response(JSON.stringify({ success: false, error: 'Acesso negado. Apenas administradores podem excluir planos.' }), { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
            }

            const plan_id = payload.plan_id || payload.planId;
            if (!plan_id) throw new Error('Identificador do plano (plan_id) não fornecido no payload.');

            console.log(`🗑️ Iniciando exclusão do plano: ${plan_id} (Requisitado por: ${user.email})`);

            // 1. Desvincular Perfis (broker_profiles)
            console.log('🔗 Desvinculando perfis de usuários...');
            const { error: err1 } = await supabaseAdmin
                .from('broker_profiles')
                .update({ subscription_plan_id: null })
                .eq('subscription_plan_id', plan_id);

            if (err1) {
                console.error('❌ Erro ao desvincular perfis:', err1.message);
                throw new Error(`Erro ao desvincular perfis: ${err1.message}`);
            }

            // 2. Desvincular Histórico de Pagamentos (payment_history)
            console.log('🔗 Desvinculando histórico de pagamentos...');
            const { error: err2 } = await supabaseAdmin
                .from('payment_history')
                .update({ plan_id: null })
                .eq('plan_id', plan_id);

            if (err2) {
                console.error('❌ Erro ao desvincular pagamentos:', err2.message);
                throw new Error(`Erro ao desvincular histórico de pagamentos: ${err2.message}`);
            }

            // 3. Excluir o Plano
            console.log('🔥 Excluindo registro do plano...');
            const { error: errDelete } = await supabaseAdmin
                .from('plans')
                .delete()
                .eq('id', plan_id);

            if (errDelete) {
                console.error('❌ Erro final na exclusão do plano:', errDelete.message);
                // Se o erro for de restrição (Foreign Key), o Postgres dirá qual tabela.
                throw new Error(`Erro ao excluir plano: ${errDelete.message}`);
            }

            console.log(`✅ Plano ${plan_id} excluído com sucesso total.`);
            return new Response(JSON.stringify({ success: true }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
        }


        console.log('⚠️ Unknown action received:', action)
        throw new Error(`Unknown Action: ${action}`)

    } catch (error: any) {
        console.error('❌ Error in admin-dash:', error)
        return new Response(JSON.stringify({
            success: false,
            error: error.message,
            action: action,
            details: error.details || null
        }), {
            status: 400,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        })
    }
})
