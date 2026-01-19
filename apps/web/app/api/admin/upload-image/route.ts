import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { checkAdminRole } from '@/lib/middleware/admin';
import { rateLimit } from '@/lib/middleware/rate-limit';
import { handleError, ValidationError, DatabaseError, ExternalServiceError } from '@/lib/middleware/error-handler';

export async function POST(request: NextRequest) {
  try {
    // Rate limiting
    const { allowed, response: rateLimitResponse } = await rateLimit(request, 'admin');
    if (!allowed) return rateLimitResponse!;

    // Check admin authorization
    const { user, error: authError } = await checkAdminRole();
    if (authError) return authError;

    const supabase = await createClient();

    // Get the uploaded file
    const formData = await request.formData();
    const file = formData.get('file') as File;

    if (!file) {
      throw new ValidationError('No file provided', {
        file: ['File is required'],
      });
    }

    // Validate file type
    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/gif'];
    if (!allowedTypes.includes(file.type)) {
      throw new ValidationError('Invalid file type. Only JPEG, PNG, WebP, and GIF are allowed.', {
        file: ['Invalid file type. Only JPEG, PNG, WebP, and GIF are allowed.'],
      });
    }

    // Validate file size (max 5MB)
    const maxSize = 5 * 1024 * 1024; // 5MB
    if (file.size > maxSize) {
      throw new ValidationError('File too large. Maximum size is 5MB.', {
        file: ['File too large. Maximum size is 5MB.'],
      });
    }

    // Generate unique filename
    const timestamp = Date.now();
    const randomString = Math.random().toString(36).substring(2, 8);
    const fileExt = file.name.split('.').pop();
    const fileName = `product-${timestamp}-${randomString}.${fileExt}`;

    // Convert file to buffer
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    // Upload to Supabase Storage
    const { data: uploadData, error: uploadError } = await supabase.storage
      .from('product-images')
      .upload(fileName, buffer, {
        contentType: file.type,
        cacheControl: '3600',
        upsert: false,
      });

    if (uploadError) {
      throw new ExternalServiceError('Supabase Storage', 'Failed to upload image: ' + uploadError.message);
    }

    // Get public URL
    const { data: { publicUrl } } = supabase.storage
      .from('product-images')
      .getPublicUrl(fileName);

    // Log admin activity
    await supabase.rpc('log_admin_activity', {
      p_action: 'upload_image',
      p_entity_type: 'product_image',
      p_entity_id: null,
      p_details: { file_name: fileName, file_size: file.size },
    });

    return NextResponse.json({
      success: true,
      url: publicUrl,
      fileName,
    });
  } catch (error) {
    return handleError(error);
  }
}
