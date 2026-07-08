import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.8"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      {
        auth: {
          persistSession: false,
          autoRefreshToken: false,
        }
      }
    )

    const body = await req.json()
    const { action } = body

    if (action === 'delete-user') {
      const { userId } = body
      if (!userId) {
        return new Response(
          JSON.stringify({ error: 'userId is required' }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
        )
      }

      // Delete from auth.users securely
      const { error: authError } = await supabaseClient.auth.admin.deleteUser(userId)
      if (authError) throw authError

      // Delete from public.profiles explicitly
      await supabaseClient.from('profiles').delete().eq('id', userId)

      return new Response(
        JSON.stringify({ message: 'User deleted successfully' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
      )
    }

    if (action === 'update-user') {
      const { userId, name, role, orgId, vendorId } = body
      if (!userId) {
        return new Response(
          JSON.stringify({ error: 'userId is required' }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
        )
      }

      // Update user auth metadata
      const { error: authError } = await supabaseClient.auth.admin.updateUserById(userId, {
        user_metadata: {
          name,
          role,
          organization_id: orgId || null,
          vendor_id: vendorId || null
        }
      })
      if (authError) throw authError

      // Update profiles table
      const { error: profileError } = await supabaseClient.from('profiles').update({
        name,
        role,
        organization_id: orgId || null,
        vendor_id: vendorId || null
      }).eq('id', userId)
      if (profileError) throw profileError

      return new Response(
        JSON.stringify({ message: 'User updated successfully' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
      )
    }

    // Default action: invite user by email
    const { email, role, orgId, vendorId } = body
    if (!email) {
      return new Response(
        JSON.stringify({ error: 'Email is required' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
      )
    }

    // Securely invite user via Auth Admin API
    const { data, error } = await supabaseClient.auth.admin.inviteUserByEmail(email, {
      redirectTo: `${req.headers.get('origin') || 'http://localhost:5173'}/signup`,
      data: {
        role: role || 'manager',
        organization_id: orgId || null,
        vendor_id: vendorId || null
      }
    })

    if (error) throw error

    return new Response(
      JSON.stringify({ message: 'Invitation sent successfully', data }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
    )
  } catch (error: any) {
    return new Response(
      JSON.stringify({ error: error.message }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
    )
  }
})
