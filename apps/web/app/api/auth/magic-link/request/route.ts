import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { sendEmail } from '@/lib/sendgrid';

export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    const { email, phone, purpose = 'login', redirectUrl } = await request.json();

    if (!email && !phone) {
      return NextResponse.json(
        { error: 'Email or phone number is required' },
        { status: 400 }
      );
    }

    const supabase = await createClient();

    // Check if user exists
    let userId: string | null = null;
    let leadId: string | null = null;
    let userName: string | null = null;

    if (email) {
      // Check in users table
      const { data: user } = await supabase
        .from('profiles')
        .select('id, full_name')
        .eq('email', email)
        .single();

      if (user) {
        userId = user.id;
        userName = user.full_name;
      } else {
        // Check in leads table
        const { data: lead } = await supabase
          .from('leads')
          .select('id, contact_name, company_name')
          .eq('email', email)
          .single();

        if (lead) {
          leadId = lead.id;
          userName = lead.contact_name || lead.company_name;
        }
      }
    }

    // Generate unique token
    const token = crypto.randomUUID() + crypto.randomUUID().replace(/-/g, '');

    // Set expiration (60 minutes from now)
    const expiresAt = new Date(Date.now() + 60 * 60 * 1000).toISOString();

    // Get IP and user agent
    const ipAddress = request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || 'unknown';
    const userAgent = request.headers.get('user-agent') || 'unknown';

    // Use atomic database function to check rate limit and insert token
    // This prevents race conditions by doing both operations atomically
    const { data: result, error: rpcError } = await supabase
      .rpc('insert_magic_link_token_with_rate_limit', {
        p_user_id: userId,
        p_lead_id: leadId,
        p_token: token,
        p_email: email || null,
        p_phone: phone || null,
        p_purpose: purpose,
        p_redirect_url: redirectUrl || null,
        p_expires_at: expiresAt,
        p_ip_address: ipAddress,
        p_user_agent: userAgent,
      });

    if (rpcError) {
      console.error('Error calling magic link function:', rpcError);
      return NextResponse.json(
        { error: 'Failed to generate magic link' },
        { status: 500 }
      );
    }

    // Check the result from the function
    if (!result || result.length === 0 || !result[0].success) {
      const errorMessage = result?.[0]?.error_message || 'Failed to generate magic link';

      // Check if it's a rate limit error
      if (errorMessage.includes('Rate limit')) {
        return NextResponse.json(
          { error: errorMessage },
          { status: 429 }
        );
      }

      return NextResponse.json(
        { error: errorMessage },
        { status: 500 }
      );
    }

    // Send magic link via email
    if (email) {
      const magicLink = `${process.env.NEXT_PUBLIC_APP_URL}/api/auth/magic-link/verify?token=${token}`;
      
      const emailSubject = purpose === 'offer_access' 
        ? 'Your exclusive offer from B2B+' 
        : 'Your login link for B2B+';

      const emailBody = `
        <!DOCTYPE html>
        <html>
          <head>
            <meta charset="utf-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
          </head>
          <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
            <div style="background-color: #f8f9fa; padding: 20px; border-radius: 8px;">
              <h2 style="color: #2563eb; margin-top: 0;">
                ${purpose === 'offer_access' ? 'Your Exclusive Offer' : 'Login to B2B+'}
              </h2>
              
              <p>Hi ${userName || 'there'},</p>
              
              <p>
                ${purpose === 'offer_access' 
                  ? 'We have a special offer just for you! Click the button below to view your personalized pricing and exclusive deals.' 
                  : 'Click the button below to securely log in to your B2B+ account:'}
              </p>
              
              <div style="text-align: center; margin: 30px 0;">
                <a href="${magicLink}" 
                   style="background-color: #2563eb; color: white; padding: 14px 28px; text-decoration: none; border-radius: 6px; display: inline-block; font-weight: bold;">
                  ${purpose === 'offer_access' ? 'View Your Offer' : 'Log In to B2B+'}
                </a>
              </div>
              
              <p style="font-size: 14px; color: #666;">
                This link expires in 60 minutes (1 hour) and can only be used once.
              </p>
              
              <p style="font-size: 14px; color: #666;">
                If you didn't request this, please ignore this email.
              </p>
              
              <hr style="border: none; border-top: 1px solid #ddd; margin: 30px 0;">
              
              <p style="font-size: 12px; color: #999;">
                Need help? Contact us at support@b2bplus.com
              </p>
              
              <p style="font-size: 12px; color: #999;">
                B2B+ - Your trusted B2B partner
              </p>
            </div>
          </body>
        </html>
      `;

      try {
        await sendEmail({
          to: email,
          subject: emailSubject,
          html: emailBody,
        });
      } catch (emailError) {
        console.error('Error sending magic link email:', emailError);
        return NextResponse.json(
          { error: 'Failed to send magic link email' },
          { status: 500 }
        );
      }
    }

    // Send magic link via SMS (if phone number provided)
    if (phone) {
      // TODO: Implement SMS sending via Twilio or similar service
      // For now, just return success
      console.log(`Magic link code for ${phone}: ${token.substring(0, 6)}`);
    }

    return NextResponse.json({
      success: true,
      message: email 
        ? 'Magic link sent to your email' 
        : 'Magic link code sent to your phone',
    });

  } catch (error) {
    console.error('Error in magic link request:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
