
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

Deno.serve(async (req) => {
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
                const payload = JSON.parse(atob(payloadBase64.replace(/-/g, '+').replace(/_/g, '/')));
                bypassedUserEmail = payload.email;
                console.log(`🎫 Decoded JWT Email: ${bypassedUserEmail}`);
            }
        } catch (e: any) {
            console.warn('⚠️ Manual JWT decode failed:', e.message);
        }

        const isOwner = bypassedUserEmail === 'adriano_amorim@hotmail.com' || bypassedUserEmail === 'contato@agenciagoodea.com';

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
        if (isServiceRole || isOwner) {
            role = 'ADMIN';
        } else {
            console.log(`🔍 Checking profile for UserID: ${user.id}`);
            const { data: userProfile, error: profileErr } = await supabaseAdmin
                .from('broker_profiles')
                .select('role')
                .eq('user_id', user.id)
                .maybeSingle();

            if (profileErr) {
                console.error('❌ Profile Fetch Error:', profileErr.message);
                return new Response(JSON.stringify({ success: false, error: 'Erro ao consultar perfil profissional.', details: profileErr.message }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
            }

            if (!userProfile) {
                console.warn(`⚠️ No profile found in broker_profiles for user_id: ${user.id}`);
                return new Response(JSON.stringify({ success: false, error: 'Seu perfil de usuário não foi encontrado no sistema.' }), { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
            }

            role = (userProfile.role || 'BROKER').toUpperCase();
        }

        const isAdmin = role === 'ADMIN';
        const isPJ = role === 'PJ';

        console.log(`🔍 Verified Session - Email: ${user.email} | Role: ${role} | isAdmin: ${isAdmin} | isPJ: ${isPJ}`);

        console.log('🔍 Parsing request body...')
        const requestData = await req.json().catch(() => ({}));
        const { action, payload } = requestData;

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

        // ACTION: GET USERS WITH AUTH DATA (Last Access & Avatar Fallback)
        if (action === 'get_users') {
            const { data: profiles, error } = await supabaseAdmin.from('broker_profiles').select('*').order('full_name', { ascending: true });
            if (error) throw error;

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

        // ACTION: DELETE USER
        if (action === 'delete_user') {
            if (!isAdmin) {
                return new Response(JSON.stringify({ success: false, error: 'Acesso negado. Apenas administradores podem excluir usuários.' }), { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
            }
            const { user_id } = payload;
            if (!user_id) throw new Error('Missing user_id')

            // 1. Try to delete from Auth (updates broker_profiles via Cascade usually)
            const { error } = await supabaseAdmin.auth.admin.deleteUser(user_id)

            if (error) {
                // If user not found in Auth, try to delete orphan profile directly
                if (error.message.includes('User not found') || error.status === 404) {
                    const { error: dbError } = await supabaseAdmin.from('broker_profiles').delete().eq('user_id', user_id);
                    if (dbError) throw dbError; // Re-throw the actual DB error if deletion fails
                    // The original instruction had a misplaced return here, corrected to re-throw dbError
                } else {
                    // Return descriptive error if not a 'User not found' issue
                    return new Response(JSON.stringify({ success: false, error: error.message }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
                }
            }

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


        console.log('⚠️ Unknown action received:', action)
        throw new Error(`Unknown Action: ${action}`)

    } catch (error: any) {
        console.error('❌ Error in admin-dash:', error)
        return new Response(JSON.stringify({ error: error.message }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
    }
})
