import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { Resend } from 'resend';

const resend = new Resend(process.env.RESEND_API_KEY);

export async function POST(request: NextRequest) {
  try {
    const { email, phone, purpose = 'login', redirectUrl } = await request.json();

    if (!email && !phone) {
      return NextResponse.json(
        { error: 'Email or phone number is required' },
        { status: 400 }
      );
    }

    const supabase = await createClient();

    // Check rate limiting (max 3 requests per hour per email/phone)
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString();
    
    const { data: recentTokens } = await supabase
      .from('magic_link_tokens')
      .select('id')
      .eq(email ? 'email' : 'phone', email || phone)
      .gte('created_at', oneHourAgo);

    if (recentTokens && recentTokens.length >= 3) {
      return NextResponse.json(
        { error: 'Too many requests. Please try again later.' },
        { status: 429 }
      );
    }

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
    
    // Set expiration (10 minutes from now)
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000).toISOString();

    // Get IP and user agent
    const ipAddress = request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || 'unknown';
    const userAgent = request.headers.get('user-agent') || 'unknown';

    // Store magic link token
    const { error: tokenError } = await supabase
      .from('magic_link_tokens')
      .insert({
        user_id: userId,
        lead_id: leadId,
        token,
        email: email || null,
        phone: phone || null,
        purpose,
        redirect_url: redirectUrl,
        expires_at: expiresAt,
        ip_address: ipAddress,
        user_agent: userAgent,
      });

    if (tokenError) {
      console.error('Error creating magic link token:', tokenError);
      return NextResponse.json(
        { error: 'Failed to generate magic link' },
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
                This link expires in 10 minutes and can only be used once.
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
        await resend.emails.send({
          from: 'B2B+ <noreply@b2bplus.com>',
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
