import { createClient } from '@/lib/supabase/server';
import { NextRequest, NextResponse } from 'next/server';
import { sendEmail } from '@/lib/sendgrid';
import { createLogger } from '@/lib/logging/logger';
import { validateRequestBody } from '@/lib/middleware/validation';
import { LeadCreateSchema } from '@/lib/validation/schemas';
import { rateLimit } from '@/lib/middleware/rate-limit';
import { handleError, DatabaseError } from '@/lib/middleware/error-handler';

const logger = createLogger('leads-create');

/**
 * Lead Capture API
 * Phase 1, Task 3.1: Lead Capture System
 * 
 * Public endpoint for capturing leads from landing page and other sources.
 * Sends notification emails to admins when new leads are created.
 */

interface LeadData {
  // Company Information
  company_name: string;
  industry?: string;
  company_size?: string;
  website?: string;
  
  // Contact Information
  contact_name?: string;
  contact_title?: string;
  email: string;
  phone?: string;
  mobile?: string;
  
  // Address
  address_line1?: string;
  address_line2?: string;
  city?: string;
  state: string;
  zip_code?: string;
  country?: string;
  
  // Lead Management
  source?: string;
  notes?: string;
  tags?: string[];
}

/**
 * Create a new lead
 * Public endpoint - no authentication required but rate limited
 */
export async function POST(request: NextRequest) {
  try {
    // Apply rate limiting (public tier)
    const { allowed, response: rateLimitResponse } = await rateLimit(request, 'public');
    if (!allowed) {
      return rateLimitResponse!;
    }

    // Validate request body with Zod schema
    const validation = await validateRequestBody(request, LeadCreateSchema);
    if (!validation.valid) {
      return validation.response!;
    }

    const leadData = validation.data!;
    
    // Create Supabase client (service role for public endpoint)
    const supabase = await createClient();
    
    // Check if lead already exists
    const { data: existingLead } = await supabase
      .from('leads')
      .select('id, status')
      .eq('email', leadData.email)
      .single();
    
    if (existingLead) {
      // Update existing lead instead of creating duplicate
      const { data: updatedLead, error: updateError } = await supabase
        .from('leads')
        .update({
          company_name: leadData.company_name,
          industry: leadData.industry,
          company_size: leadData.company_size,
          website: leadData.website,
          contact_name: leadData.contact_name,
          contact_title: leadData.contact_title,
          phone: leadData.phone,
          mobile: leadData.mobile,
          address_line1: leadData.address_line1,
          address_line2: leadData.address_line2,
          city: leadData.city,
          state: leadData.state,
          zip_code: leadData.zip_code,
          country: leadData.country || 'US',
          source: leadData.source || 'website',
          notes: leadData.notes,
          tags: leadData.tags,
          updated_at: new Date().toISOString(),
        })
        .eq('id', existingLead.id)
        .select()
        .single();
      
      if (updateError) {
        throw DatabaseError.queryFailed('leads', 'update');
      }
      
      return NextResponse.json({
        success: true,
        leadId: updatedLead.id,
        message: 'Lead updated successfully',
      });
    }
    
    // Calculate lead score based on provided information
    let leadScore = 0;
    if (leadData.company_name) leadScore += 10;
    if (leadData.email) leadScore += 10;
    if (leadData.phone || leadData.mobile) leadScore += 10;
    if (leadData.website) leadScore += 10;
    if (leadData.industry) leadScore += 10;
    if (leadData.company_size) leadScore += 10;
    if (leadData.contact_name) leadScore += 10;
    if (leadData.contact_title) leadScore += 10;
    if (leadData.city && leadData.state) leadScore += 10;
    if (leadData.notes) leadScore += 10;
    
    // Determine region based on state
    const { data: region } = await supabase
      .from('regions')
      .select('id')
      .contains('states', [leadData.state])
      .single();
    
    // Create new lead
    const { data: lead, error: createError } = await supabase
      .from('leads')
      .insert({
        company_name: leadData.company_name,
        industry: leadData.industry,
        company_size: leadData.company_size,
        website: leadData.website,
        contact_name: leadData.contact_name,
        contact_title: leadData.contact_title,
        email: leadData.email,
        phone: leadData.phone,
        mobile: leadData.mobile,
        address_line1: leadData.address_line1,
        address_line2: leadData.address_line2,
        city: leadData.city,
        state: leadData.state,
        zip_code: leadData.zip_code,
        country: leadData.country || 'US',
        status: 'new',
        source: leadData.source || 'website',
        lead_score: leadScore,
        region_id: region?.id,
        notes: leadData.notes,
        tags: leadData.tags,
      })
      .select()
      .single();
    
    if (createError) {
      throw DatabaseError.queryFailed('leads', 'insert');
    }
    
    // Send notification email to admins
    try {
      await sendAdminNotification(lead);
    } catch (emailError) {
      logger.error('Failed to send admin notification:', emailError);
      // Don't fail the request if email fails
    }
    
    // Send confirmation email to lead
    try {
      await sendLeadConfirmation(lead);
    } catch (emailError) {
      logger.error('Failed to send lead confirmation:', emailError);
      // Don't fail the request if email fails
    }
    
    return NextResponse.json({
      success: true,
      leadId: lead.id,
      message: 'Lead created successfully',
    });

  } catch (error) {
    logger.error('Lead creation error:', error);
    return handleError(error);
  }
}

/**
 * Send notification email to admins about new lead
 */
async function sendAdminNotification(lead: any) {
  const supabase = await createClient();
  
  // Get all admin users
  const { data: admins } = await supabase
    .from('profiles')
    .select('id, email, full_name')
    .in('role', ['admin', 'super_admin']);
  
  if (!admins || admins.length === 0) {
    logger.warn('No admin users found to notify');
    return;
  }
  
  // Send email to each admin
  for (const admin of admins) {
    if (!admin.email) continue;
    
    await sendEmail({
      to: admin.email,
      subject: `New Lead: ${lead.company_name}`,
      html: `
        <h2>New Lead Captured</h2>
        <p>A new lead has been submitted through the website:</p>
        
        <h3>Company Information</h3>
        <ul>
          <li><strong>Company:</strong> ${lead.company_name}</li>
          ${lead.industry ? `<li><strong>Industry:</strong> ${lead.industry}</li>` : ''}
          ${lead.company_size ? `<li><strong>Size:</strong> ${lead.company_size}</li>` : ''}
          ${lead.website ? `<li><strong>Website:</strong> <a href="${lead.website}">${lead.website}</a></li>` : ''}
        </ul>
        
        <h3>Contact Information</h3>
        <ul>
          ${lead.contact_name ? `<li><strong>Name:</strong> ${lead.contact_name}</li>` : ''}
          ${lead.contact_title ? `<li><strong>Title:</strong> ${lead.contact_title}</li>` : ''}
          <li><strong>Email:</strong> <a href="mailto:${lead.email}">${lead.email}</a></li>
          ${lead.phone ? `<li><strong>Phone:</strong> ${lead.phone}</li>` : ''}
        </ul>
        
        <h3>Location</h3>
        <ul>
          ${lead.city ? `<li><strong>City:</strong> ${lead.city}</li>` : ''}
          <li><strong>State:</strong> ${lead.state}</li>
          ${lead.zip_code ? `<li><strong>ZIP:</strong> ${lead.zip_code}</li>` : ''}
        </ul>
        
        <h3>Lead Details</h3>
        <ul>
          <li><strong>Lead Score:</strong> ${lead.lead_score}/100</li>
          <li><strong>Source:</strong> ${lead.source}</li>
          ${lead.notes ? `<li><strong>Notes:</strong> ${lead.notes}</li>` : ''}
        </ul>
        
        <p><a href="${process.env.NEXT_PUBLIC_APP_URL}/app/admin/leads/${lead.id}" style="background-color: #4F46E5; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block; margin-top: 16px;">View Lead in CRM</a></p>
      `,
    });
  }
}

/**
 * Send confirmation email to lead
 */
async function sendLeadConfirmation(lead: any) {
  await sendEmail({
    to: lead.email,
    subject: 'Thank you for your interest in B2B Plus',
    html: `
      <h2>Thank you for your interest!</h2>
      <p>Hi${lead.contact_name ? ` ${lead.contact_name}` : ''},</p>
      
      <p>Thank you for reaching out to B2B Plus. We've received your information and one of our team members will be in touch with you shortly.</p>
      
      <p>In the meantime, feel free to explore our platform and learn more about how we can help ${lead.company_name} streamline your B2B ordering process.</p>
      
      <h3>What's Next?</h3>
      <ul>
        <li>Our team will review your information within 24 hours</li>
        <li>We'll reach out to schedule a demo tailored to your needs</li>
        <li>You'll receive a personalized proposal based on your requirements</li>
      </ul>
      
      <p>If you have any immediate questions, please don't hesitate to reply to this email.</p>
      
      <p>Best regards,<br>
      The B2B Plus Team</p>
    `,
  });
}

