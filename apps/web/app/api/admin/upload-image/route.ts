import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { checkAdminRole } from '@/lib/middleware/admin';

export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    // Check admin authorization
    const authCheck = await checkAdminRole();
    if (!authCheck.authorized) {
      return NextResponse.json({ error: authCheck.error }, { status: authCheck.status });
    }

    const supabase = await createClient();

    // Get the uploaded file
    const formData = await request.formData();
    const fileData = formData.get('file');

    if (!fileData || !(fileData instanceof File)) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 });
    }

    const file: File = fileData;

    // Validate file type
    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/gif'];
    if (!allowedTypes.includes(file.type)) {
      return NextResponse.json(
        { error: 'Invalid file type. Only JPEG, PNG, WebP, and GIF are allowed.' },
        { status: 400 }
      );
    }

    // Validate file size (max 5MB)
    const maxSize = 5 * 1024 * 1024; // 5MB
    if (file.size > maxSize) {
      return NextResponse.json(
        { error: 'File too large. Maximum size is 5MB.' },
        { status: 400 }
      );
    }

    // SECURITY: Validate file content (magic numbers) to prevent fake extensions
    // Read first few bytes to verify actual file type
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    const header = buffer.slice(0, 4).toString('hex');

    // Check magic numbers for common image formats
    const isValidImage =
      header.startsWith('ffd8ff') ||  // JPEG
      header.startsWith('89504e47') || // PNG
      header.startsWith('47494638') || // GIF
      header.startsWith('52494646');  // WEBP (starts with RIFF)

    if (!isValidImage) {
      return NextResponse.json(
        { error: 'Invalid image file. File content does not match a supported image format.' },
        { status: 400 }
      );
    }

    // Generate unique filename
    const timestamp = Date.now();
    const randomString = Math.random().toString(36).substring(2, 8);
    const fileExt = file.name.split('.').pop();
    const fileName = `product-${timestamp}-${randomString}.${fileExt}`;

    // Upload to Supabase Storage (buffer already created during validation)
    const { data: uploadData, error: uploadError } = await supabase.storage
      .from('product-images')
      .upload(fileName, buffer, {
        contentType: file.type,
        cacheControl: '3600',
        upsert: false,
      });

    if (uploadError) {
      console.error('Upload error:', uploadError);
      return NextResponse.json(
        { error: 'Failed to upload image: ' + uploadError.message },
        { status: 500 }
      );
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
  } catch (error: unknown) {
    console.error('Image upload error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json(
      { error: 'Internal server error: ' + errorMessage },
      { status: 500 }
    );
  }
}
