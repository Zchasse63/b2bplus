import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { rateLimit } from '@/lib/middleware/rate-limit';
import { handleError, AuthError, ValidationError } from '@/lib/middleware/error-handler';

export async function POST(request: NextRequest) {
  try {
    // Rate limiting
    const { allowed, response: rateLimitResponse } = await rateLimit(request, 'admin');
    if (!allowed) return rateLimitResponse!;

    const { leads, autoAssignRegion = true, autoCreateAccounts = false } = await request.json();

    if (!leads || !Array.isArray(leads) || leads.length === 0) {
      throw new ValidationError('Leads array is required', { leads: ['Must be a non-empty array'] });
    }

    const supabase = await createClient();

    // Get current user
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      throw new AuthError('Authentication required', 'unauthorized');
    }

    // Get regions for auto-assignment
    const { data: regions } = await supabase
      .from('regions')
      .select('*')
      .eq('is_active', true);

    let importedCount = 0;
    let skippedCount = 0;
    let errorCount = 0;
    const errors: string[] = [];

    for (const leadData of leads) {
      try {
        // Validate required fields
        if (!leadData.company_name || !leadData.email || !leadData.state) {
          skippedCount++;
          errors.push(`Skipped lead: Missing required fields (company_name, email, or state)`);
          continue;
        }

        // Check if lead already exists
        const { data: existingLead } = await supabase
          .from('leads')
          .select('id')
          .eq('email', leadData.email)
          .single();

        if (existingLead) {
          skippedCount++;
          errors.push(`Skipped lead ${leadData.email}: Already exists`);
          continue;
        }

        // Auto-assign region based on state
        let regionId = leadData.region_id || null;

        if (autoAssignRegion && !regionId && regions) {
          const region = regions.find(r => r.states.includes(leadData.state));
          if (region) {
            regionId = region.id;
          }
        }

        // Prepare lead data
        const newLead = {
          company_name: leadData.company_name,
          industry: leadData.industry || null,
          company_size: leadData.company_size || null,
          website: leadData.website || null,
          contact_name: leadData.contact_name || null,
          contact_title: leadData.contact_title || null,
          email: leadData.email,
          phone: leadData.phone || null,
          mobile: leadData.mobile || null,
          address_line1: leadData.address_line1 || null,
          address_line2: leadData.address_line2 || null,
          city: leadData.city || null,
          state: leadData.state,
          zip_code: leadData.zip_code || null,
          country: leadData.country || 'US',
          status: leadData.status || 'new',
          source: 'import',
          region_id: regionId,
          buying_group_id: leadData.buying_group_id || null,
          notes: leadData.notes || null,
          tags: leadData.tags || [],
          created_by: user.id,
        };

        // Insert lead
        const { data: insertedLead, error: insertError } = await supabase
          .from('leads')
          .insert(newLead)
          .select()
          .single();

        if (insertError) {
          errorCount++;
          errors.push(`Error importing ${leadData.email}: ${insertError.message}`);
          continue;
        }

        // Auto-create account if requested
        if (autoCreateAccounts && insertedLead) {
          try {
            const adminClient = createAdminClient();
            const { data: authData, error: signUpError } = await adminClient.auth.admin.createUser({
              email: leadData.email,
              password: crypto.randomUUID(),
              email_confirm: true,
              user_metadata: {
                full_name: leadData.contact_name,
                company_name: leadData.company_name,
                phone: leadData.phone,
              },
            });

            if (!signUpError && authData.user) {
              // Update lead with user_id
              await supabase
                .from('leads')
                .update({
                  user_id: authData.user.id,
                  account_created: true,
                  account_created_at: new Date().toISOString(),
                  status: 'converted',
                })
                .eq('id', insertedLead.id);

              // Create profile
              await supabase
                .from('profiles')
                .insert({
                  id: authData.user.id,
                  email: leadData.email,
                  full_name: leadData.contact_name,
                  company_name: leadData.company_name,
                  phone: leadData.phone,
                  address_line1: leadData.address_line1,
                  address_line2: leadData.address_line2,
                  city: leadData.city,
                  state: leadData.state,
                  zip_code: leadData.zip_code,
                  country: leadData.country || 'US',
                });

              // Log activity
              await supabase
                .from('lead_activities')
                .insert({
                  lead_id: insertedLead.id,
                  activity_type: 'account_created',
                  description: 'Account auto-created during import',
                  metadata: {
                    user_id: authData.user.id,
                  },
                  performed_by: user.id,
                });
            }
          } catch (accountError) {
            console.error(`Error creating account for ${leadData.email}:`, accountError);
            // Continue anyway - lead is imported, just no account created
          }
        }

        importedCount++;

      } catch (leadError) {
        errorCount++;
        errors.push(`Error processing lead: ${leadError instanceof Error ? leadError.message : 'Unknown error'}`);
      }
    }

    return NextResponse.json({
      success: true,
      importedCount,
      skippedCount,
      errorCount,
      totalLeads: leads.length,
      errors: errors.length > 0 ? errors : undefined,
      message: `Imported ${importedCount} leads (${skippedCount} skipped, ${errorCount} errors)`,
    });

  } catch (error) {
    return handleError(error);
  }
}
