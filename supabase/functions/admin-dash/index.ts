
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

        // ACTION: GET SYSTEM METRICS (Full Dashboard Data)
        if (action === 'get_metrics') {

            // 1. Users Stats
            const { count: usersCount } = await supabaseAdmin.from('broker_profiles').select('*', { count: 'exact', head: true })
            const { count: newUsers } = await supabaseAdmin.from('broker_profiles').select('*', { count: 'exact', head: true }).gt('created_at', new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString())

            // 2. Active Plans & MRR Calculation
            const { data: activeProfiles } = await supabaseAdmin
                .from('broker_profiles')
                .select('subscription_plan_id, plans:subscription_plan_id(price, billing_cycle)')
                .eq('status', 'Ativo');

            let activeSubs = 0;
            let mrr = 0;

            if (activeProfiles) {
                activeSubs = activeProfiles.length;
                activeProfiles.forEach((p: any) => {
                    const plan = p.plans; // Check if singular or array based on relation
                    // Supabase returns object if 1:1, array if 1:N. Assuming plan_id is FK, it returns single object usually if setup correctly, or array.
                    // Let's handle generic case:
                    const priceData = Array.isArray(plan) ? plan[0] : plan;

                    if (priceData && priceData.price) {
                        const price = parseFloat(priceData.price);
                        mrr += (priceData.billing_cycle === 'Anual') ? (price / 12) : price;
                    }
                });
            }

            // 3. Inspections Stats
            const { count: totalInspections } = await supabaseAdmin.from('inspections').select('*', { count: 'exact', head: true });

            // Status distribution for Chart
            const { data: inspectionStatus } = await supabaseAdmin.from('inspections').select('status');
            const inspectionCounts: Record<string, number> = { 'Agendada': 0, 'Em andamento': 0, 'Concluída': 0, 'Rascunho': 0 };

            inspectionStatus?.forEach((i: any) => {
                if (inspectionCounts[i.status] !== undefined) inspectionCounts[i.status]++;
                else if (i.status === 'Pendente') inspectionCounts['Em andamento']++; // Map Pendente to Em andamento
                else inspectionCounts['Em andamento']++; // Fallback
            });

            // 4. Recent Transactions
            const { data: recentTransactions } = await supabaseAdmin
                .from('payment_history')
                .select('amount, status, created_at, plan_name, profiles:user_id(full_name, avatar_url)')
                .order('created_at', { ascending: false })
                .limit(5);

            return new Response(JSON.stringify({
                success: true,
                stats: {
                    mrr: mrr,
                    activeSubs: activeSubs,
                    totalInspections: totalInspections || 0,
                    totalUsers: usersCount || 0,
                    newUsers30d: newUsers || 0
                },
                charts: {
                    inspectionStatus: inspectionCounts
                },
                recentTransactions: recentTransactions
            }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
        }

        // ACTION: GET ALL PAYMENTS (Payments Page)
        if (action === 'get_payments') {
            const { data: payments, error } = await supabaseAdmin
                .from('payment_history')
                .select(`*, user:user_id(full_name, email)`)
                .order('created_at', { ascending: false })
                .limit(100)

            if (error) throw error

            return new Response(JSON.stringify({ payments }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
        }


        // ACTION: GET ALL SUBSCRIPTIONS (Subscriptions Page)
        if (action === 'get_subscriptions') {
            const { data: profiles, error } = await supabaseAdmin
                .from('broker_profiles')
                .select('*, plans:subscription_plan_id(*)')
                .order('created_at', { ascending: false });

            if (error) throw error;

            // Optional: Get payments to correlate last payment manually if needed, 
            // but for now let's return profiles. The frontend explicitly joined payments.
            // Let's fetch payments too so frontend can map them.
            const { data: payments } = await supabaseAdmin.from('payment_history').select('*').eq('status', 'approved');

            return new Response(JSON.stringify({
                success: true,
                profiles,
                payments
            }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
        }

        throw new Error('Unknown Action')

    } catch (error: any) {
        return new Response(JSON.stringify({ error: error.message }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
    }
})
