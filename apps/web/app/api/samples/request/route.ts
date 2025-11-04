import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { sendEmail } from '@/lib/sendgrid';

export async function POST(request: NextRequest) {
  try {
    const {
      productId,
      requesterName,
      requesterEmail,
      requesterPhone,
      requesterCompany,
      quantity = 1,
      purpose,
      notes,
    } = await request.json();

    if (!productId || !requesterName || !requesterEmail) {
      return NextResponse.json(
        { error: 'Product ID, name, and email are required' },
        { status: 400 }
      );
    }

    const supabase = await createClient();

    // Get product details
    const { data: product, error: productError } = await supabase
      .from('products')
      .select('id, name, sku, price')
      .eq('id', productId)
      .single();

    if (productError || !product) {
      return NextResponse.json(
        { error: 'Product not found' },
        { status: 404 }
      );
    }

    // Get current user if logged in
    const { data: { user } } = await supabase.auth.getUser();
    let userId = user?.id || null;
    let leadId = null;

    // Check if requester is a lead
    if (!userId) {
      const { data: lead } = await supabase
        .from('leads')
        .select('id')
        .eq('email', requesterEmail)
        .single();

      if (lead) {
        leadId = lead.id;
      }
    }

    // Create sample request
    const { data: sampleRequest, error: requestError } = await supabase
      .from('sample_requests')
      .insert({
        user_id: userId,
        lead_id: leadId,
        requester_name: requesterName,
        requester_email: requesterEmail,
        requester_phone: requesterPhone,
        requester_company: requesterCompany,
        product_id: productId,
        product_name: product.name,
        product_sku: product.sku,
        quantity,
        purpose,
        notes,
        status: 'pending',
      })
      .select()
      .single();

    if (requestError) {
      console.error('Error creating sample request:', requestError);
      return NextResponse.json(
        { error: 'Failed to create sample request' },
        { status: 500 }
      );
    }

    // Log activity if lead exists
    if (leadId) {
      await supabase
        .from('lead_activities')
        .insert({
          lead_id: leadId,
          activity_type: 'sample_requested',
          subject: `Sample requested: ${product.name}`,
          description: `Requested ${quantity} sample(s) of ${product.name} (${product.sku})`,
          metadata: {
            sample_request_id: sampleRequest.id,
            product_id: productId,
            quantity,
          },
        });
    }

    // Send notification email to admin
    const adminEmail = process.env.ADMIN_EMAIL || 'admin@b2bplus.com';

    await sendEmail({
      to: adminEmail,
      subject: `New Sample Request: ${product.name}`,
      html: `
        <!DOCTYPE html>
        <html>
          <head>
            <meta charset="utf-8">
          </head>
          <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
            <h2 style="color: #2563eb;">New Sample Request</h2>

            <h3>Product Details:</h3>
            <ul>
              <li><strong>Product:</strong> ${product.name}</li>
              <li><strong>SKU:</strong> ${product.sku}</li>
              <li><strong>Quantity:</strong> ${quantity}</li>
            </ul>

            <h3>Requester Details:</h3>
            <ul>
              <li><strong>Name:</strong> ${requesterName}</li>
              <li><strong>Email:</strong> ${requesterEmail}</li>
              <li><strong>Phone:</strong> ${requesterPhone || 'Not provided'}</li>
              <li><strong>Company:</strong> ${requesterCompany || 'Not provided'}</li>
            </ul>

            ${purpose ? `<h3>Purpose:</h3><p>${purpose}</p>` : ''}
            ${notes ? `<h3>Notes:</h3><p>${notes}</p>` : ''}

            <p style="margin-top: 30px;">
              <a href="${process.env.NEXT_PUBLIC_APP_URL}/admin/samples"
                 style="background-color: #2563eb; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block;">
                View Sample Requests
              </a>
            </p>
          </body>
        </html>
      `,
    });

    // Send confirmation email to requester
    await sendEmail({
      to: requesterEmail,
      subject: `Sample Request Received: ${product.name}`,
      html: `
        <!DOCTYPE html>
        <html>
          <head>
            <meta charset="utf-8">
          </head>
          <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
            <h2 style="color: #2563eb;">Sample Request Received</h2>

            <p>Hi ${requesterName},</p>

            <p>We've received your request for a sample of <strong>${product.name}</strong>.</p>

            <p>Our team will review your request and get back to you within 1-2 business days.</p>

            <h3>Request Details:</h3>
            <ul>
              <li><strong>Product:</strong> ${product.name}</li>
              <li><strong>SKU:</strong> ${product.sku}</li>
              <li><strong>Quantity:</strong> ${quantity}</li>
            </ul>

            <p>If you have any questions, please don't hesitate to contact us.</p>

            <p>Best regards,<br>B2B+ Team</p>
          </body>
        </html>
      `,
    });

    return NextResponse.json({
      success: true,
      sampleRequest,
      message: 'Sample request submitted successfully',
    });

  } catch (error) {
    console.error('Error in sample request:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const status = searchParams.get('status') || 'all';

    const supabase = await createClient();

    // Get current user
    const { data: { user } } = await supabase.auth.getUser();
    
    let query = supabase
      .from('sample_requests')
      .select('*, products(name, sku, images)')
      .order('created_at', { ascending: false });

    // Filter by user if not admin
    const { data: profile } = await supabase
      .from('organization_members')
      .select('role')
      .eq('user_id', user?.id)
      .single();

    if (profile?.role !== 'admin' && user) {
      query = query.eq('user_id', user.id);
    }

    if (status !== 'all') {
      query = query.eq('status', status);
    }

    const { data: sampleRequests, error } = await query;

    if (error) {
      console.error('Error fetching sample requests:', error);
      return NextResponse.json(
        { error: 'Failed to fetch sample requests' },
        { status: 500 }
      );
    }

    return NextResponse.json({ sampleRequests });

  } catch (error) {
    console.error('Error in sample requests fetch:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
