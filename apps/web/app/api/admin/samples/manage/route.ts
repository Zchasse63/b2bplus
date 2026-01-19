import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { sendEmail } from '@/lib/sendgrid';
import { rateLimit } from '@/lib/middleware/rate-limit';
import { handleError, AuthError, NotFoundError, ValidationError, DatabaseError } from '@/lib/middleware/error-handler';

export async function POST(request: NextRequest) {
  try {
    // Rate limiting
    const { allowed, response: rateLimitResponse } = await rateLimit(request, 'admin');
    if (!allowed) return rateLimitResponse!;

    const {
      sampleRequestId,
      action,
      trackingNumber,
      carrier,
      notes,
    } = await request.json();

    if (!sampleRequestId || !action) {
      throw new ValidationError('Sample request ID and action are required', {
        sampleRequestId: !sampleRequestId ? ['Sample request ID is required'] : [],
        action: !action ? ['Action is required'] : [],
      });
    }

    const supabase = await createClient();

    // Get current user
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      throw new AuthError('Unauthorized');
    }

    // Get sample request details
    const { data: sampleRequest } = await supabase
      .from('sample_requests')
      .select('*')
      .eq('id', sampleRequestId)
      .single();

    if (!sampleRequest) {
      throw new NotFoundError('Sample request', sampleRequestId);
    }

    const updateData: Record<string, unknown> = {};

    if (action === 'approve') {
      updateData.status = 'approved';
      updateData.approved_by = user.id;
      updateData.approved_at = new Date().toISOString();
    } else if (action === 'ship') {
      updateData.status = 'shipped';
      updateData.shipped_at = new Date().toISOString();
      if (trackingNumber) updateData.tracking_number = trackingNumber;
      if (carrier) updateData.carrier = carrier;
    } else if (action === 'deliver') {
      updateData.status = 'delivered';
      updateData.delivered_at = new Date().toISOString();
    } else if (action === 'decline') {
      updateData.status = 'declined';
    }

    const { data: updatedRequest, error } = await supabase
      .from('sample_requests')
      .update(updateData)
      .eq('id', sampleRequestId)
      .select()
      .single();

    if (error) {
      throw DatabaseError.queryFailed('sample_requests', 'update');
    }

    // Send email notification to requester
    let emailSubject = '';
    let emailBody = '';

    if (action === 'approve') {
      emailSubject = `Sample Request Approved: ${sampleRequest.product_name}`;
      emailBody = `
        <h2 style="color: #2563eb;">Sample Request Approved</h2>
        <p>Hi ${sampleRequest.requester_name},</p>
        <p>Great news! Your sample request for <strong>${sampleRequest.product_name}</strong> has been approved.</p>
        <p>We'll process and ship your sample shortly. You'll receive another email with tracking information once it ships.</p>
        ${notes ? `<p><strong>Notes:</strong> ${notes}</p>` : ''}
      `;
    } else if (action === 'ship') {
      emailSubject = `Sample Shipped: ${sampleRequest.product_name}`;
      emailBody = `
        <h2 style="color: #2563eb;">Your Sample Has Shipped!</h2>
        <p>Hi ${sampleRequest.requester_name},</p>
        <p>Your sample of <strong>${sampleRequest.product_name}</strong> has been shipped!</p>
        ${trackingNumber ? `<p><strong>Tracking Number:</strong> ${trackingNumber}</p>` : ''}
        ${carrier ? `<p><strong>Carrier:</strong> ${carrier}</p>` : ''}
        <p>You should receive your sample within 3-5 business days.</p>
      `;
    } else if (action === 'decline') {
      emailSubject = `Sample Request Update: ${sampleRequest.product_name}`;
      emailBody = `
        <h2 style="color: #2563eb;">Sample Request Update</h2>
        <p>Hi ${sampleRequest.requester_name},</p>
        <p>Thank you for your interest in <strong>${sampleRequest.product_name}</strong>.</p>
        <p>Unfortunately, we're unable to fulfill your sample request at this time.</p>
        ${notes ? `<p><strong>Reason:</strong> ${notes}</p>` : ''}
        <p>If you have any questions, please don't hesitate to contact us.</p>
      `;
    }

    if (emailSubject && emailBody) {
      await sendEmail({
        to: sampleRequest.requester_email,
        subject: emailSubject,
        html: `
          <!DOCTYPE html>
          <html>
            <head>
              <meta charset="utf-8">
            </head>
            <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
              ${emailBody}
              <p>Best regards,<br>B2B+ Team</p>
            </body>
          </html>
        `,
      });
    }

    return NextResponse.json({
      success: true,
      sampleRequest: updatedRequest,
      message: `Sample request ${action}d successfully`,
    });

  } catch (error) {
    return handleError(error);
  }
}
