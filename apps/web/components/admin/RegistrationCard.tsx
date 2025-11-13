'use client';

import { useState } from 'react';
import { Card } from '@/components/b2b/Card';
import { Button } from '@/components/b2b/Button';
import { Badge } from '@/components/b2b/Badge';
import { useToast } from '@/hooks/use-toast';
import { useRouter } from 'next/navigation';
import { FiCheck, FiX, FiMail, FiUser, FiCalendar, FiDollarSign } from 'react-icons/fi';

/**
 * Registration Card Component
 * Phase 1, Task 3.3: Registration Approval UI
 * 
 * Displays organization registration details with approve/reject actions.
 */

interface RegistrationCardProps {
  organization: any;
  readonly?: boolean;
}

export function RegistrationCard({ organization, readonly = false }: RegistrationCardProps) {
  const { toast } = useToast();
  const router = useRouter();
  const [isProcessing, setIsProcessing] = useState(false);
  const [showRejectDialog, setShowRejectDialog] = useState(false);
  const [rejectionReason, setRejectionReason] = useState('');

  const owner = organization.members?.find((m: any) => m.role === 'owner')?.user;

  const handleApprove = async () => {
    setIsProcessing(true);

    try {
      const response = await fetch('/api/admin/organizations/approve', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          organizationId: organization.id,
          action: 'approve',
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to approve organization');
      }

      toast({
        title: 'Organization Approved',
        description: `${organization.name} has been approved and notified.`,
      });

      router.refresh();
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Failed to approve organization',
        variant: 'destructive',
      });
    } finally {
      setIsProcessing(false);
    }
  };

  const handleReject = async () => {
    if (!rejectionReason.trim()) {
      toast({
        title: 'Error',
        description: 'Please provide a reason for rejection',
        variant: 'destructive',
      });
      return;
    }

    setIsProcessing(true);

    try {
      const response = await fetch('/api/admin/organizations/approve', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          organizationId: organization.id,
          action: 'reject',
          reason: rejectionReason,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to reject organization');
      }

      toast({
        title: 'Organization Rejected',
        description: `${organization.name} has been rejected and notified.`,
      });

      setShowRejectDialog(false);
      setRejectionReason('');
      router.refresh();
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Failed to reject organization',
        variant: 'destructive',
      });
    } finally {
      setIsProcessing(false);
    }
  };

  const getStatusBadge = () => {
    switch (organization.approval_status) {
      case 'pending':
        return <Badge variant="warning">Pending</Badge>;
      case 'approved':
        return <Badge variant="success">Approved</Badge>;
      case 'rejected':
        return <Badge variant="error">Rejected</Badge>;
      default:
        return null;
    }
  };

  return (
    <Card padding="lg" className="bg-white">
      <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4">
        {/* Organization Info */}
        <div className="flex-1">
          <div className="flex items-center gap-3 mb-3">
            <h3 className="text-xl font-bold text-b2b-dark">
              {organization.name}
            </h3>
            {getStatusBadge()}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
            {owner && (
              <div className="flex items-center gap-2 text-b2b-gray-600">
                <FiUser className="h-4 w-4" />
                <span>
                  <strong>Owner:</strong> {owner.full_name || owner.email}
                </span>
              </div>
            )}

            {owner?.email && (
              <div className="flex items-center gap-2 text-b2b-gray-600">
                <FiMail className="h-4 w-4" />
                <a href={`mailto:${owner.email}`} className="hover:text-b2b-blue">
                  {owner.email}
                </a>
              </div>
            )}

            <div className="flex items-center gap-2 text-b2b-gray-600">
              <FiCalendar className="h-4 w-4" />
              <span>
                <strong>Created:</strong>{' '}
                {new Date(organization.created_at).toLocaleDateString()}
              </span>
            </div>

            {organization.credit_limit && (
              <div className="flex items-center gap-2 text-b2b-gray-600">
                <FiDollarSign className="h-4 w-4" />
                <span>
                  <strong>Credit Limit:</strong> ${organization.credit_limit.toLocaleString()}
                </span>
              </div>
            )}
          </div>

          {organization.approval_status === 'approved' && organization.approved_at && (
            <div className="mt-3 text-sm text-b2b-gray-600">
              <strong>Approved:</strong>{' '}
              {new Date(organization.approved_at).toLocaleDateString()}
            </div>
          )}

          {organization.approval_status === 'rejected' && organization.rejection_reason && (
            <div className="mt-3 p-3 bg-b2b-red bg-opacity-10 rounded-lg">
              <p className="text-sm text-b2b-red">
                <strong>Rejection Reason:</strong> {organization.rejection_reason}
              </p>
            </div>
          )}
        </div>

        {/* Actions */}
        {!readonly && organization.approval_status === 'pending' && (
          <div className="flex flex-col gap-2 md:min-w-[200px]">
            {!showRejectDialog ? (
              <>
                <Button
                  variant="primary"
                  size="sm"
                  icon={<FiCheck />}
                  onClick={handleApprove}
                  disabled={isProcessing}
                  className="w-full"
                >
                  Approve
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  icon={<FiX />}
                  onClick={() => setShowRejectDialog(true)}
                  disabled={isProcessing}
                  className="w-full"
                >
                  Reject
                </Button>
              </>
            ) : (
              <div className="space-y-2">
                <textarea
                  value={rejectionReason}
                  onChange={(e) => setRejectionReason(e.target.value)}
                  placeholder="Reason for rejection..."
                  rows={3}
                  className="w-full px-3 py-2 border border-b2b-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-b2b-blue text-sm"
                />
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleReject}
                    disabled={isProcessing}
                    className="flex-1"
                  >
                    Confirm Reject
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setShowRejectDialog(false);
                      setRejectionReason('');
                    }}
                    disabled={isProcessing}
                    className="flex-1"
                  >
                    Cancel
                  </Button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </Card>
  );
}

