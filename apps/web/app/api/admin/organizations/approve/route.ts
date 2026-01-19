import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { checkAdminRole } from '@/lib/middleware/admin';
import { sendEmail, createEmailTemplate } from '@/lib/sendgrid';
import { csrfProtection } from '@/lib/middleware/csrf';
import { rateLimit } from '@/lib/middleware/rate-limit';
import { validateRequestBody } from '@/lib/middleware/validation';
import { OrganizationApproveSchema } from '@/lib/validation/schemas';
import { handleError, NotFoundError, DatabaseError } from '@/lib/middleware/error-handler';

/**
 * Organization Approval API
 *
 * Allows super admins to approve or reject organization registrations
 * Phase 1, Task 1.3: Registration Approval System
 */
export async function POST(request: NextRequest) {
  // CSRF Protection
  const { valid, response: csrfResponse } = await csrfProtection(request);
  if (!valid) {
    return csrfResponse!;
  }

  try {
    // Rate limiting
    const { allowed, response: rateLimitResponse } = await rateLimit(request, 'admin');
    if (!allowed) return rateLimitResponse!;

    // Validate request body
    const validation = await validateRequestBody(request, OrganizationApproveSchema);
    if (!validation.valid) return validation.response!;

    const { organizationId, approved, notes } = validation.data!;
    const action = approved ? 'approve' : 'reject';

    // Check admin role (only super_admin can approve organizations)
    const { user, error: authError } = await checkAdminRole(true);
    if (authError) {
      return authError;
    }

    const supabase = await createClient();

    // Get organization details with owner info
    const { data: org, error: orgError } = await supabase
      .from('organizations')
      .select(`
        *,
        members:organization_members!inner(
          user:profiles!inner(
            id,
            email,
            full_name
          )
        )
      `)
      .eq('id', organizationId)
      .eq('organization_members.role', 'owner')
      .single();

    if (orgError || !org) {
      throw new NotFoundError('Organization', organizationId);
    }

    // Get owner details
    const owner = org.members?.[0]?.user;
    if (!owner) {
      throw new NotFoundError('Organization owner');
    }

    // Update organization based on action
    const updateData: any = {};

    if (action === 'approve') {
      updateData.approval_status = 'approved';
      updateData.approved_by = user!.id;
      updateData.approved_at = new Date().toISOString();
      updateData.rejection_reason = null;
    } else {
      updateData.approval_status = 'rejected';
      updateData.rejection_reason = notes;
      updateData.approved_by = user!.id;
      updateData.approved_at = new Date().toISOString();
    }

    const { data: updatedOrg, error: updateError } = await supabase
      .from('organizations')
      .update(updateData)
      .eq('id', organizationId)
      .select()
      .single();

    if (updateError) {
      throw DatabaseError.queryFailed('organizations', 'update');
    }

    // Send email notification
    try {
      if (action === 'approve') {
        // Send welcome email
        await sendEmail({
          to: owner.email,
          subject: 'Welcome to B2B+ - Your Account is Approved!',
          html: createEmailTemplate({
            body: `
              <h2 style="color: #10b981;">Account Approved!</h2>
              <p>Hi ${owner.full_name || 'there'},</p>
              <p>Great news! Your organization <strong>${org.name}</strong> has been approved and is now active on B2B+.</p>
              <p>You can now:</p>
              <ul>
                <li>Browse our complete product catalog</li>
                <li>Place orders online 24/7</li>
                <li>Track order history and invoices</li>
                <li>Manage your team members</li>
                <li>Access AI-powered insights and recommendations</li>
              </ul>
              <p style="margin-top: 30px;">
                <a href="${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/login"
                   style="background-color: #2563eb; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block;">
                  Log In to Your Account
                </a>
              </p>
              <p style="margin-top: 30px;">If you have any questions, our team is here to help!</p>
            `,
          }),
          categories: ['organization-approval', 'welcome'],
          customArgs: {
            organization_id: organizationId,
            action: 'approved',
          },
        });
      } else {
        // Send rejection email
        await sendEmail({
          to: owner.email,
          subject: 'B2B+ Registration Update',
          html: createEmailTemplate({
            body: `
              <h2 style="color: #ef4444;">Registration Status Update</h2>
              <p>Hi ${owner.full_name || 'there'},</p>
              <p>Thank you for your interest in B2B+. After reviewing your registration for <strong>${org.name}</strong>, we're unable to approve your account at this time.</p>
              ${notes ? `
                <p><strong>Reason:</strong></p>
                <p style="background-color: #fef2f2; padding: 15px; border-left: 4px solid #ef4444; margin: 20px 0;">
                  ${notes}
                </p>
              ` : ''}
              <p>If you believe this is an error or would like to discuss this further, please contact our team:</p>
              <ul>
                <li>Email: ${process.env.SENDGRID_REPLY_TO_EMAIL || 'support@b2bplus.com'}</li>
                <li>Phone: (555) 123-4567</li>
              </ul>
              <p>We appreciate your understanding.</p>
            `,
          }),
          categories: ['organization-approval', 'rejection'],
          customArgs: {
            organization_id: organizationId,
            action: 'rejected',
          },
        });
      }
    } catch (emailError) {
      console.error('Error sending email:', emailError);
      // Don't fail the request if email fails
    }

    return NextResponse.json({
      success: true,
      organization: updatedOrg,
      message: `Organization ${action}d successfully`,
    });

  } catch (error) {
    return handleError(error);
  }
}
