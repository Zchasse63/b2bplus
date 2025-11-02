import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { cookies } from 'next/headers';

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
      // Get user email from profiles
      const { data: profile } = await supabase
        .from('profiles')
        .select('email')
        .eq('id', magicLinkToken.user_id)
        .single();

      if (profile?.email) {
        // Sign in user using Supabase Auth
        const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
          email: profile.email,
          password: magicLinkToken.token, // Use token as temporary password
        });

        // If password auth fails, try to sign in with OTP
        if (authError) {
          const { error: otpError } = await supabase.auth.signInWithOtp({
            email: profile.email,
          });

          if (otpError) {
            console.error('Error signing in user:', otpError);
            return NextResponse.redirect(new URL('/login?error=auth_failed', request.url));
          }
        }
      }

      // Redirect to intended page or dashboard
      const redirectUrl = magicLinkToken.redirect_url || '/dashboard';
      return NextResponse.redirect(new URL(redirectUrl, request.url));
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
      const { data: authData, error: signUpError } = await supabase.auth.signUp({
        email: lead.email,
        password: crypto.randomUUID(), // Generate random password (user won't need it)
        options: {
          data: {
            full_name: lead.contact_name,
            company_name: lead.company_name,
            phone: lead.phone,
          },
        },
      });

      if (signUpError || !authData.user) {
        console.error('Error creating user account:', signUpError);
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
    console.error('Error in magic link verification:', error);
    return NextResponse.redirect(new URL('/login?error=server_error', request.url));
  }
}
