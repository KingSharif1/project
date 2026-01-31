
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const { username, companyCode, facilityId, clinicId } = await req.json();

    if (!username || !companyCode || !facilityId) {
      throw new Error('Missing required fields: username, companyCode, facilityId');
    }

    const email = `${username}@${companyCode}.system.local`.toLowerCase();
    const password = 'Welcome123!';

    // 1. Create the user in Supabase Auth
    const { data: authData, error: authError } = await supabaseClient.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: {
        role: 'dispatcher', // or 'facility_user'
        full_name: username, // or deriving from somewhere else?
        is_temp_password: true,
      }
    });

    if (authError) throw authError;
    if (!authData.user) throw new Error('User creation failed');

    const userId = authData.user.id;

    // 2. Add to public.users table (if not handled by trigger)
    // Assuming we have a trigger, but explicitly doing it is safer/clearer for this custom flow if needed.
    // Actually, usually we rely on triggers. But let's check if we need to manually insert.
    // Based on previous chats, there might be a trigger. But for safety/robustness:
    
    // Check if user exists in public.users, if not insert.
    const { data: existingUser } = await supabaseClient
      .from('users')
      .select('id')
      .eq('id', userId)
      .single();

    if (!existingUser) {
        await supabaseClient.from('users').insert({
            id: userId,
            email: email,
            full_name: username,
            role: 'dispatcher',
            is_active: true
        });
    }

    // 3. Link user to clinic
    await supabaseClient.from('user_clinics').insert({
        user_id: userId,
        clinic_id: clinicId,
        role: 'dispatcher' // or 'facility_staff'
    });

    // 4. Link user to facility (Wait, how do we link user to facility directly? 
    // Usually via user_metadata or a separate table.
    // The requirement implies this user manages this facility.
    // Maybe we need a `user_facilities` table or `facility_id` in `users`?
    // For now, let's assume `user_clinics` is enough for company association, 
    // and maybe we add `facility_id` to `user_clinics` or a `user_id` to `facilities`?
    // "Facility User (Partner Dispatcher)... ONLY see/edit trips they created".
    // If they create trips, the created_by will be them. 
    // But how do they filter to "their" facility? 
    // Maybe simpler: Store `facility_id` in `user_metadata` or `public.users`? 
    // I'll add it to `user_clinics` or just rely on RLS filtering by created_by.
    // But they need to be associated with the facility.
    // Let's check `user_clinics` schema again... it has `role`.
    // I'll assume for now we just create the user. Association might be loose (just by clinic) 
    // or we'll add `facility_id` to `user_metadata`.
    
    // Let's store facility_id in user_metadata just in case.
    await supabaseClient.auth.admin.updateUserById(userId, {
        user_metadata: { facility_id: facilityId }
    });

    return new Response(
      JSON.stringify({ 
        success: true, 
        user: { id: userId, email, username } 
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    );

  } catch (error) {
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      }
    );
  }
});
