
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

        // 1. Verify Requestor is Authenticated (and ideally Admin)
        const authHeader = req.headers.get('Authorization')
        if (!authHeader) throw new Error('Missing Authorization Header')

        const token = authHeader.replace('Bearer ', '')
        const { data: { user }, error: authError } = await supabaseAdmin.auth.getUser(token)

        if (authError || !user) throw new Error('Unauthorized')

        // Optional: Verify 'ADMIN' role here if needed.
        // const { data: profile } = await supabaseAdmin.from('broker_profiles').select('role').eq('user_id', user.id).single()
        // if (profile?.role !== 'ADMIN') throw new Error('Forbidden')

        const { action, payload } = await req.json()

        // ACTION: DELETE USER
        if (action === 'delete_user') {
            const { user_id } = payload
            if (!user_id) throw new Error('Missing user_id')

            // Delete from Auth (this cascades if DB is set up right, but we force specific logic if needed)
            const { error } = await supabaseAdmin.auth.admin.deleteUser(user_id)
            if (error) throw error

            return new Response(JSON.stringify({ success: true }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
        }

        // ACTION: GET SYSTEM METRICS (Reports)
        if (action === 'get_metrics') {
            // Users Count
            const { count: usersCount } = await supabaseAdmin.from('broker_profiles').select('*', { count: 'exact', head: true })

            // Revenue & Payments
            const { data: payments } = await supabaseAdmin.from('payment_history').select('amount, status, created_at')
            const totalRevenue = payments?.filter(p => p.status === 'approved').reduce((acc, p) => acc + (Number(p.amount) || 0), 0) || 0
            const pendingCount = payments?.filter(p => p.status === 'pending').length || 0

            // Active Plans
            const { count: activePlans } = await supabaseAdmin.from('broker_profiles').select('*', { count: 'exact', head: true }).eq('subscription_status', 'Ativo')
            const { count: totalVistorias } = await supabaseAdmin.from('inspections').select('*', { count: 'exact', head: true })

            // New Users 30d
            const d = new Date()
            d.setDate(d.getDate() - 30)
            const { count: newUsers } = await supabaseAdmin.from('broker_profiles').select('*', { count: 'exact', head: true }).gt('created_at', d.toISOString())

            return new Response(JSON.stringify({
                users_count: usersCount,
                revenue: totalRevenue,
                active_plans: activePlans,
                inspections_count: totalVistorias,
                pending_payments: pendingCount,
                new_users_30d: newUsers,
                all_payments: payments // Return list for Payments Page if needed (limit this if too large)
            }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
        }

        // ACTION: GET ALL PAYMENTS (Payments Page)
        if (action === 'get_payments') {
            const { data: payments, error } = await supabaseAdmin
                .from('payment_history')
                .select(`
                *,
                user:user_id(full_name, email)
            `)
                .order('created_at', { ascending: false })
                .limit(100)

            if (error) throw error

            // Manual User Join fallback if relation fails or user_id is in broker_profiles
            // But payment_history usually relates to auth.users. 
            // We will return what we found.
            return new Response(JSON.stringify({ payments }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
        }

        throw new Error('Unknown Action')

    } catch (error: any) {
        return new Response(JSON.stringify({ error: error.message }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
    }
})
