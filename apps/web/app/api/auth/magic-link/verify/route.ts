import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { cookies } from 'next/headers';
import { generateSecurePassword } from '@/lib/security/password-generator';

export const dynamic = 'force-dynamic';

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

    // If user_id exists, create a session for them
    if (magicLinkToken.user_id) {
      // Get user email from profiles
      const { data: profile } = await supabase
        .from('profiles')
        .select('email')
        .eq('id', magicLinkToken.user_id)
        .single();

      if (profile?.email) {
        // Generate a magic link using Supabase's built-in functionality
        // This will create a proper session token
        const { data: linkData, error: linkError } = await supabase.auth.admin.generateLink({
          type: 'magiclink',
          email: profile.email,
          options: {
            redirectTo: magicLinkToken.redirect_url || '/dashboard',
          },
        });

        if (linkError || !linkData) {
          console.error('Error generating magic link:', linkError);
          return NextResponse.redirect(new URL('/login?error=auth_failed', request.url));
        }

        // Extract the token from the generated link and redirect to Supabase's auth callback
        // The callback will create the session
        const url = new URL(linkData.properties.action_link);
        const authToken = url.searchParams.get('token');
        const type = url.searchParams.get('type');

        if (authToken && type) {
          // Redirect to Supabase's auth callback which will create the session
          const callbackUrl = new URL('/auth/callback', request.url);
          callbackUrl.searchParams.set('token_hash', authToken);
          callbackUrl.searchParams.set('type', type);
          callbackUrl.searchParams.set('next', magicLinkToken.redirect_url || '/dashboard');
          return NextResponse.redirect(callbackUrl);
        }
      }

      // Fallback redirect if something goes wrong
      const redirectUrl = magicLinkToken.redirect_url || '/dashboard';
      return NextResponse.redirect(new URL(redirectUrl, request.url));
    }

    // If lead_id exists, create account and sign them in (or sign in if account already exists)
    if (magicLinkToken.lead_id) {
      const { data: lead } = await supabase
        .from('leads')
        .select('*')
        .eq('id', magicLinkToken.lead_id)
        .single();

      if (!lead) {
        return NextResponse.redirect(new URL('/login?error=lead_not_found', request.url));
      }

      // Check if user already exists by querying profiles table
      const { data: existingProfile } = await supabase
        .from('profiles')
        .select('id, email')
        .eq('email', lead.email)
        .single();

      let userId: string;

      if (existingProfile) {
        // User already exists - just update lead and log activity
        userId = existingProfile.id;

        // Update lead with user_id if not already set
        if (!lead.user_id) {
          await supabase
            .from('leads')
            .update({
              user_id: userId,
              account_created: true,
              account_created_at: new Date().toISOString(),
              status: 'converted',
            })
            .eq('id', magicLinkToken.lead_id);
        }

        // Log activity
        await supabase
          .from('lead_activities')
          .insert({
            lead_id: magicLinkToken.lead_id,
            activity_type: 'magic_link_login',
            description: 'Logged in via magic link (existing user)',
            metadata: {
              user_id: userId,
              purpose: magicLinkToken.purpose,
            },
          });
      } else {
        // Create new user account with secure password
        const { data: authData, error: signUpError } = await supabase.auth.signUp({
          email: lead.email,
          password: generateSecurePassword(), // Generate 32-character secure password
          options: {
            data: {
              full_name: lead.contact_name,
              company_name: lead.company_name,
              phone: lead.phone,
            },
            emailRedirectTo: magicLinkToken.redirect_url || '/products',
          },
        });

        if (signUpError || !authData.user) {
          console.error('Error creating user account:', signUpError);
          return NextResponse.redirect(new URL('/login?error=signup_failed', request.url));
        }

        userId = authData.user.id;

        // Update lead with user_id
        await supabase
          .from('leads')
          .update({
            user_id: userId,
            account_created: true,
            account_created_at: new Date().toISOString(),
            status: 'converted',
          })
          .eq('id', magicLinkToken.lead_id);

        // Create profile
        await supabase
          .from('profiles')
          .insert({
            id: userId,
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
              user_id: userId,
              purpose: magicLinkToken.purpose,
            },
          });
      }

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
