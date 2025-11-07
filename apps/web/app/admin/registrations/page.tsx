import { createClient } from '@/lib/supabase/server';
import { checkAdminRole } from '@/lib/middleware/admin';
import { redirect } from 'next/navigation';
import { Card } from '@/components/b2b/Card';
import { Badge } from '@/components/b2b/Badge';
import { RegistrationCard } from '@/components/admin/RegistrationCard';

/**
 * Registration Approval Page
 * Phase 1, Task 3.3: Registration Approval UI
 * 
 * Admin page for viewing and approving/rejecting pending organization registrations.
 * Only accessible to super_admin users.
 */

export default async function PendingRegistrationsPage() {
  // Check admin authorization (super_admin only)
  const { user, error: authError } = await checkAdminRole(true);
  if (authError) {
    redirect('/auth/login');
  }

  const supabase = await createClient();

  // Get pending registrations
  const { data: pending, error: pendingError } = await supabase
    .from('organizations')
    .select(`
      *,
      members:organization_members!inner(
        id,
        role,
        user:profiles!inner(
          id,
          email,
          full_name
        )
      )
    `)
    .eq('approval_status', 'pending')
    .order('created_at', { ascending: false });

  // Get recently approved registrations
  const { data: approved, error: approvedError } = await supabase
    .from('organizations')
    .select(`
      *,
      members:organization_members!inner(
        id,
        role,
        user:profiles!inner(
          id,
          email,
          full_name
        )
      )
    `)
    .eq('approval_status', 'approved')
    .order('approved_at', { ascending: false })
    .limit(10);

  // Get recently rejected registrations
  const { data: rejected, error: rejectedError } = await supabase
    .from('organizations')
    .select(`
      *,
      members:organization_members!inner(
        id,
        role,
        user:profiles!inner(
          id,
          email,
          full_name
        )
      )
    `)
    .eq('approval_status', 'rejected')
    .order('updated_at', { ascending: false })
    .limit(10);

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-b2b-dark mb-2">
          Organization Registrations
        </h1>
        <p className="text-b2b-gray-600">
          Review and approve or reject pending organization registrations.
        </p>
      </div>

      {/* Statistics */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
        <Card padding="lg">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-b2b-gray-600 mb-1">Pending</p>
              <p className="text-3xl font-bold text-b2b-orange">
                {pending?.length || 0}
              </p>
            </div>
            <Badge variant="warning">Needs Review</Badge>
          </div>
        </Card>

        <Card padding="lg">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-b2b-gray-600 mb-1">Approved</p>
              <p className="text-3xl font-bold text-b2b-green">
                {approved?.length || 0}
              </p>
            </div>
            <Badge variant="success">Active</Badge>
          </div>
        </Card>

        <Card padding="lg">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-b2b-gray-600 mb-1">Rejected</p>
              <p className="text-3xl font-bold text-b2b-red">
                {rejected?.length || 0}
              </p>
            </div>
            <Badge variant="error">Declined</Badge>
          </div>
        </Card>
      </div>

      {/* Pending Registrations */}
      <div className="mb-8">
        <h2 className="text-2xl font-bold text-b2b-dark mb-4">
          Pending Registrations
        </h2>
        {pending && pending.length > 0 ? (
          <div className="space-y-4">
            {pending.map((org: any) => (
              <RegistrationCard key={org.id} organization={org} />
            ))}
          </div>
        ) : (
          <Card padding="lg">
            <p className="text-center text-b2b-gray-600">
              No pending registrations at this time.
            </p>
          </Card>
        )}
      </div>

      {/* Recently Approved */}
      <div className="mb-8">
        <h2 className="text-2xl font-bold text-b2b-dark mb-4">
          Recently Approved
        </h2>
        {approved && approved.length > 0 ? (
          <div className="space-y-4">
            {approved.map((org: any) => (
              <RegistrationCard key={org.id} organization={org} readonly />
            ))}
          </div>
        ) : (
          <Card padding="lg">
            <p className="text-center text-b2b-gray-600">
              No approved registrations yet.
            </p>
          </Card>
        )}
      </div>

      {/* Recently Rejected */}
      <div className="mb-8">
        <h2 className="text-2xl font-bold text-b2b-dark mb-4">
          Recently Rejected
        </h2>
        {rejected && rejected.length > 0 ? (
          <div className="space-y-4">
            {rejected.map((org: any) => (
              <RegistrationCard key={org.id} organization={org} readonly />
            ))}
          </div>
        ) : (
          <Card padding="lg">
            <p className="text-center text-b2b-gray-600">
              No rejected registrations.
            </p>
          </Card>
        )}
      </div>
    </div>
  );
}

