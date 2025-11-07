import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createClient as createSupabaseClient } from '@supabase/supabase-js';
import { cookies } from 'next/headers';
import { logger } from '@/lib/logger';

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const token = searchParams.get('token');

    if (!token) {
      return NextResponse.redirect(new URL('/login?error=invalid_token', request.url));
    }

    const supabase = await createClient();

    // Fetch magic link token
    const { data: magicLinkToken, error: tokenError } = await supabase
      .from('magic_link_tokens')
      .select('*')
      .eq('token', token)
      .single();

    if (tokenError || !magicLinkToken) {
      return NextResponse.redirect(new URL('/login?error=invalid_token', request.url));
    }

    // Check if token is expired
    const now = new Date();
    const expiresAt = new Date(magicLinkToken.expires_at);
    
    if (now > expiresAt) {
      return NextResponse.redirect(new URL('/login?error=expired_token', request.url));
    }

    // Check if token has already been used
    if (magicLinkToken.used_at) {
      return NextResponse.redirect(new URL('/login?error=token_already_used', request.url));
    }

    // Mark token as used
    await supabase
      .from('magic_link_tokens')
      .update({ used_at: new Date().toISOString() })
      .eq('token', token);

    // If user_id exists, sign them in
    if (magicLinkToken.user_id) {
      // SECURITY FIX: Use service role to create a valid session
      // We've already validated the token, so we can safely create a session
      const supabaseAdmin = createSupabaseClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.SUPABASE_SERVICE_ROLE_KEY!,
        {
          auth: {
            autoRefreshToken: false,
            persistSession: false
          }
        }
      );

      // Generate a secure session for the user
      const { data: sessionData, error: sessionError } = await supabaseAdmin.auth.admin.createSession({
        user_id: magicLinkToken.user_id
      });

      if (sessionError || !sessionData.session) {
        logger.error('Error creating session:', sessionError);
        return NextResponse.redirect(new URL('/login?error=session_failed', request.url));
      }

      // Set the session cookies
      const response = NextResponse.redirect(
        new URL(magicLinkToken.redirect_url || '/dashboard', request.url)
      );

      response.cookies.set({
        name: 'sb-access-token',
        value: sessionData.session.access_token,
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        maxAge: sessionData.session.expires_in || 3600
      });

      response.cookies.set({
        name: 'sb-refresh-token',
        value: sessionData.session.refresh_token,
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        maxAge: 60 * 60 * 24 * 7 // 7 days
      });

      return response;
    }

    // If lead_id exists, create account and sign them in
    if (magicLinkToken.lead_id) {
      const { data: lead } = await supabase
        .from('leads')
        .select('*')
        .eq('id', magicLinkToken.lead_id)
        .single();

      if (!lead) {
        return NextResponse.redirect(new URL('/login?error=lead_not_found', request.url));
      }

      // Create user account
      // SECURITY FIX: Generate a strong random password using crypto.randomBytes
      // Previous implementation used a single UUID which is weak
      // User won't need this password as they'll use magic links
      const randomPassword = crypto.randomBytes(32).toString('base64').slice(0, 64);

      const { data: authData, error: signUpError } = await supabase.auth.signUp({
        email: lead.email,
        password: randomPassword,
        options: {
          data: {
            full_name: lead.contact_name,
            company_name: lead.company_name,
            phone: lead.phone,
          },
        },
      });

      if (signUpError || !authData.user) {
        logger.error('Error creating user account:', signUpError);
        return NextResponse.redirect(new URL('/login?error=signup_failed', request.url));
      }

      // Update lead with user_id
      await supabase
        .from('leads')
        .update({
          user_id: authData.user.id,
          account_created: true,
          account_created_at: new Date().toISOString(),
          status: 'converted',
        })
        .eq('id', magicLinkToken.lead_id);

      // Create profile
      await supabase
        .from('profiles')
        .insert({
          id: authData.user.id,
          email: lead.email,
          full_name: lead.contact_name,
          company_name: lead.company_name,
          phone: lead.phone,
          address_line1: lead.address_line1,
          address_line2: lead.address_line2,
          city: lead.city,
          state: lead.state,
          zip_code: lead.zip_code,
          country: lead.country,
        });

      // Log activity
      await supabase
        .from('lead_activities')
        .insert({
          lead_id: magicLinkToken.lead_id,
          activity_type: 'account_created',
          description: 'Account created via magic link',
          metadata: {
            user_id: authData.user.id,
            purpose: magicLinkToken.purpose,
          },
        });

      // Redirect to intended page or welcome page
      const redirectUrl = magicLinkToken.redirect_url || '/welcome';
      return NextResponse.redirect(new URL(redirectUrl, request.url));
    }

    // If neither user_id nor lead_id exists, redirect to signup
    return NextResponse.redirect(new URL('/signup?email=' + encodeURIComponent(magicLinkToken.email || ''), request.url));

  } catch (error) {
    logger.error('Error in magic link verification:', error);
    return NextResponse.redirect(new URL('/login?error=server_error', request.url));
  }
}
