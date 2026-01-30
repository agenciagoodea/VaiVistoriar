
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
        const supabaseAdmin = createClient(
            Deno.env.get('SUPABASE_URL') ?? '',
            Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
        )

        // 1. Verify Requestor is Authenticated
        const authHeader = req.headers.get('Authorization')
        if (!authHeader) throw new Error('Missing Authorization Header')

        const token = authHeader.replace('Bearer ', '')
        const { data: { user }, error: authError } = await supabaseAdmin.auth.getUser(token)

        if (authError || !user) throw new Error('Unauthorized')

        const { action, payload } = await req.json()

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
            // 1. Users Stats
            const { count: usersCount } = await supabaseAdmin.from('broker_profiles').select('*', { count: 'exact', head: true })
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
            const { data: profiles, error } = await supabaseAdmin.from('broker_profiles').select('*, plans:subscription_plan_id(*)').order('created_at', { ascending: false });
            if (error) throw error;

            const { data: payments } = await supabaseAdmin.from('payment_history').select('*').eq('status', 'approved');

            return new Response(JSON.stringify({ success: true, profiles, payments }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
        }

        throw new Error('Unknown Action')

    } catch (error: any) {
        return new Response(JSON.stringify({ error: error.message }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
    }
})
