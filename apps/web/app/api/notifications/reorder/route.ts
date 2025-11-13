/**
 * Phase 2: AI Backend Logic - Reorder Notifications API
 * 
 * POST /api/notifications/reorder
 * Generate reorder predictions and send notifications to customers
 */

import { createClient } from '@/lib/supabase/server';
import { NextRequest, NextResponse } from 'next/server';
import { validateAdminAIRequest } from '@/lib/middleware/ai-security';
import { 
  generateOrganizationReorderPredictions,
  saveReorderPrediction,
  ReorderPrediction 
} from '@/lib/ai/reorder-predictions';
import { sendEmail, createEmailTemplate } from '@/lib/sendgrid';
import { logAIUsage } from '@/lib/ai/usage-tracking';

interface ReorderNotificationRequest {
  organizationId?: string; // If not provided, generate for all organizations
  sendEmails?: boolean; // Whether to send email notifications
  minConfidence?: number; // Minimum confidence score (0-1)
  daysAhead?: number; // Only notify for reorders within this many days
}

/**
 * POST /api/notifications/reorder
 * Generate reorder predictions and optionally send notifications
 */
export async function POST(request: NextRequest) {
  try {
    // Validate AI request (admin only)
    const validation = await validateAdminAIRequest(request);
    if (!validation.authorized) {
      return NextResponse.json(
        { error: validation.error },
        { status: 403 }
      );
    }

    const supabase = await createClient();
    const body: ReorderNotificationRequest = await request.json();
    const {
      organizationId,
      sendEmails = false,
      minConfidence = 0.6,
      daysAhead = 14,
    } = body;

    // Get organizations to process
    let organizationIds: string[] = [];
    
    if (organizationId) {
      organizationIds = [organizationId];
    } else {
      // Get all active organizations
      const { data: orgs, error } = await supabase
        .from('organizations')
        .select('id')
        .eq('status', 'active');

      if (error || !orgs) {
        return NextResponse.json(
          { error: 'Failed to fetch organizations' },
          { status: 500 }
        );
      }

      organizationIds = orgs.map(org => org.id);
    }

    const results = {
      totalOrganizations: organizationIds.length,
      totalPredictions: 0,
      notificationsSent: 0,
      errors: [] as string[],
    };

    // Process each organization
    for (const orgId of organizationIds) {
      try {
        // Generate predictions
        const predictions = await generateOrganizationReorderPredictions(
          orgId,
          2, // Minimum 2 orders
          minConfidence
        );

        // Filter predictions within the specified time window
        const upcomingPredictions = predictions.filter(p => {
          const daysUntil = Math.floor(
            (p.predictedReorderDate.getTime() - Date.now()) / (1000 * 60 * 60 * 24)
          );
          return daysUntil >= -7 && daysUntil <= daysAhead; // Include overdue up to 7 days
        });

        // Save predictions to database
        for (const prediction of upcomingPredictions) {
          try {
            await saveReorderPrediction(orgId, prediction);
            results.totalPredictions++;
          } catch (error) {
            console.error(`Failed to save prediction for org ${orgId}:`, error);
          }
        }

        // Send email notifications if requested
        if (sendEmails && upcomingPredictions.length > 0) {
          try {
            await sendReorderNotificationEmail(orgId, upcomingPredictions);
            results.notificationsSent++;
          } catch (error) {
            console.error(`Failed to send notification for org ${orgId}:`, error);
            results.errors.push(`Email failed for org ${orgId}`);
          }
        }

      } catch (error) {
        console.error(`Failed to process organization ${orgId}:`, error);
        results.errors.push(`Processing failed for org ${orgId}`);
      }
    }

    // Log AI usage
    await logAIUsage({
      userId: validation.userId!,
      organizationId: organizationId || '',
      endpoint: '/api/notifications/reorder',
      operationType: 'reorder-notifications',
      tokensUsed: results.totalPredictions * 300,
      success: true,
    });

    return NextResponse.json({
      success: true,
      ...results,
    });

  } catch (error) {
    console.error('Reorder notifications API error:', error);
    return NextResponse.json(
      { error: 'Failed to generate reorder notifications' },
      { status: 500 }
    );
  }
}

/**
 * GET /api/notifications/reorder?organizationId=xxx
 * Get reorder notifications for an organization
 */
export async function GET(request: NextRequest) {
  try {
    // Validate AI request
    const validation = await validateAdminAIRequest(request);
    if (!validation.authorized) {
      return NextResponse.json(
        { error: validation.error },
        { status: 403 }
      );
    }

    const supabase = await createClient();
    const { searchParams } = new URL(request.url);
    const organizationId = searchParams.get('organizationId');
    const status = searchParams.get('status') || 'pending';

    if (!organizationId) {
      return NextResponse.json(
        { error: 'Organization ID is required' },
        { status: 400 }
      );
    }

    // Verify user has access to this organization
    const { data: membership } = await supabase
      .from('organization_members')
      .select('role')
      .eq('user_id', validation.userId)
      .eq('organization_id', organizationId)
      .single();

    if (!membership) {
      return NextResponse.json(
        { error: 'Access denied' },
        { status: 403 }
      );
    }

    // Get reorder notifications
    const { data: notifications, error } = await supabase
      .from('reorder_notifications')
      .select(`
        *,
        products(id, name, sku, price, image_url)
      `)
      .eq('organization_id', organizationId)
      .eq('status', status)
      .order('predicted_reorder_date', { ascending: true });

    if (error) {
      throw error;
    }

    return NextResponse.json({
      success: true,
      notifications: notifications || [],
    });

  } catch (error) {
    console.error('Get reorder notifications error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch reorder notifications' },
      { status: 500 }
    );
  }
}

/**
 * Send reorder notification email to organization
 */
async function sendReorderNotificationEmail(
  organizationId: string,
  predictions: ReorderPrediction[]
): Promise<void> {
  const supabase = await createClient();

  // Get organization details
  const { data: org } = await supabase
    .from('organizations')
    .select('name, contact_email')
    .eq('id', organizationId)
    .single();

  if (!org || !org.contact_email) {
    throw new Error('Organization contact email not found');
  }

  // Group predictions by urgency
  const overdue = predictions.filter(p => p.predictedReorderDate < new Date());
  const upcoming = predictions.filter(p => p.predictedReorderDate >= new Date());

  const html = createEmailTemplate({
    body: `
      <h1>Reorder Recommendations for ${org.name}</h1>
      <p>Based on your purchase history, we've identified products you may need to reorder soon.</p>

      ${overdue.length > 0 ? `
        <h2 style="color: #ef4444;">⚠️ Overdue Reorders (${overdue.length})</h2>
        <table style="width: 100%; border-collapse: collapse; margin-bottom: 30px;">
          <thead>
            <tr style="background-color: #f3f4f6;">
              <th style="padding: 12px; text-align: left; border-bottom: 2px solid #e5e7eb;">Product</th>
              <th style="padding: 12px; text-align: center; border-bottom: 2px solid #e5e7eb;">Recommended Qty</th>
              <th style="padding: 12px; text-align: center; border-bottom: 2px solid #e5e7eb;">Days Overdue</th>
              <th style="padding: 12px; text-align: center; border-bottom: 2px solid #e5e7eb;">Confidence</th>
            </tr>
          </thead>
          <tbody>
            ${overdue.map(p => {
              const daysOverdue = Math.floor((Date.now() - p.predictedReorderDate.getTime()) / (1000 * 60 * 60 * 24));
              return `
                <tr>
                  <td style="padding: 12px; border-bottom: 1px solid #e5e7eb;">${p.productName}</td>
                  <td style="padding: 12px; text-align: center; border-bottom: 1px solid #e5e7eb;">${p.recommendedQuantity}</td>
                  <td style="padding: 12px; text-align: center; border-bottom: 1px solid #e5e7eb; color: #ef4444;">${daysOverdue} days</td>
                  <td style="padding: 12px; text-align: center; border-bottom: 1px solid #e5e7eb;">${Math.round(p.confidenceScore * 100)}%</td>
                </tr>
              `;
            }).join('')}
          </tbody>
        </table>
      ` : ''}

      ${upcoming.length > 0 ? `
        <h2>📅 Upcoming Reorders (${upcoming.length})</h2>
        <table style="width: 100%; border-collapse: collapse; margin-bottom: 30px;">
          <thead>
            <tr style="background-color: #f3f4f6;">
              <th style="padding: 12px; text-align: left; border-bottom: 2px solid #e5e7eb;">Product</th>
              <th style="padding: 12px; text-align: center; border-bottom: 2px solid #e5e7eb;">Recommended Qty</th>
              <th style="padding: 12px; text-align: center; border-bottom: 2px solid #e5e7eb;">Reorder Date</th>
              <th style="padding: 12px; text-align: center; border-bottom: 2px solid #e5e7eb;">Confidence</th>
            </tr>
          </thead>
          <tbody>
            ${upcoming.map(p => `
              <tr>
                <td style="padding: 12px; border-bottom: 1px solid #e5e7eb;">${p.productName}</td>
                <td style="padding: 12px; text-align: center; border-bottom: 1px solid #e5e7eb;">${p.recommendedQuantity}</td>
                <td style="padding: 12px; text-align: center; border-bottom: 1px solid #e5e7eb;">${p.predictedReorderDate.toLocaleDateString()}</td>
                <td style="padding: 12px; text-align: center; border-bottom: 1px solid #e5e7eb;">${Math.round(p.confidenceScore * 100)}%</td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      ` : ''}

      <div style="margin-top: 30px; padding: 20px; background-color: #f9fafb; border-radius: 8px; text-align: center;">
        <p style="margin: 0 0 15px 0; font-size: 16px;"><strong>Ready to Reorder?</strong></p>
        <a href="${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/dashboard" 
           style="display: inline-block; background-color: #3b82f6; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold;">
          View Dashboard
        </a>
      </div>

      <p style="margin-top: 30px; font-size: 14px; color: #6b7280;">
        <em>These recommendations are based on your historical purchase patterns. Actual needs may vary based on your current inventory and business requirements.</em>
      </p>
    `,
  });

  await sendEmail({
    to: org.contact_email,
    subject: `Reorder Recommendations for ${org.name}`,
    html,
    categories: ['reorder_notification', 'automated'],
    customArgs: {
      organization_id: organizationId,
      total_predictions: predictions.length.toString(),
      overdue_count: overdue.length.toString(),
    },
  });
}

