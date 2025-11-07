'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  CheckCircle, 
  XCircle, 
  Clock, 
  AlertTriangle,
  TrendingUp,
  Users,
  DollarSign
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface PendingApproval {
  id: string;
  order_id: string;
  total_amount: number;
  customer_email: string;
  risk_score: number;
  requires_manual_review: boolean;
  manual_review_reason: string | null;
  created_at: string;
}

interface ApprovalStatistics {
  total_orders: number;
  auto_approved: number;
  manually_approved: number;
  rejected: number;
  pending: number;
  auto_approval_rate: number;
  avg_approval_time_hours: number;
}

export default function ApprovalsPage() {
  const [pendingApprovals, setPendingApprovals] = useState<PendingApproval[]>([]);
  const [statistics, setStatistics] = useState<ApprovalStatistics | null>(null);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState<string | null>(null);
  const [selectedApproval, setSelectedApproval] = useState<PendingApproval | null>(null);
  const { toast } = useToast();
  const supabase = createClient();

  useEffect(() => {
    fetchData();
    
    // Refresh every 30 seconds
    const interval = setInterval(fetchData, 30000);
    return () => clearInterval(interval);
  }, []);

  async function fetchData() {
    setLoading(true);
    try {
      const response = await fetch('/api/admin/orders/auto-approve');
      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Failed to fetch data');
      }

      setPendingApprovals(result.pending_approvals || []);
      setStatistics(result.statistics || null);
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message,
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  }

  async function handleApprove(approvalId: string, notes?: string) {
    setProcessing(approvalId);
    try {
      const response = await fetch('/api/admin/orders/auto-approve', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          approval_id: approvalId,
          action: 'approve',
          notes,
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Approval failed');
      }

      toast({
        title: 'Order Approved',
        description: result.message,
      });

      fetchData();
      setSelectedApproval(null);
    } catch (error: any) {
      toast({
        title: 'Approval Failed',
        description: error.message,
        variant: 'destructive',
      });
    } finally {
      setProcessing(null);
    }
  }

  async function handleReject(approvalId: string, reason: string) {
    setProcessing(approvalId);
    try {
      const response = await fetch('/api/admin/orders/auto-approve', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          approval_id: approvalId,
          action: 'reject',
          notes: reason,
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Rejection failed');
      }

      toast({
        title: 'Order Rejected',
        description: result.message,
      });

      fetchData();
      setSelectedApproval(null);
    } catch (error: any) {
      toast({
        title: 'Rejection Failed',
        description: error.message,
        variant: 'destructive',
      });
    } finally {
      setProcessing(null);
    }
  }

  function getRiskBadge(riskScore: number) {
    if (riskScore < 0.25) {
      return <Badge className="bg-green-500 text-white">Low Risk</Badge>;
    } else if (riskScore < 0.5) {
      return <Badge className="bg-yellow-500 text-white">Medium Risk</Badge>;
    } else if (riskScore < 0.75) {
      return <Badge className="bg-orange-500 text-white">High Risk</Badge>;
    } else {
      return <Badge className="bg-red-500 text-white">Critical Risk</Badge>;
    }
  }

  return (
    <div className="container mx-auto py-8 px-4">
      <div className="mb-8">
        <h1 className="text-3xl font-bold">Order Approvals</h1>
        <p className="text-gray-600 mt-2">AI-powered order approval queue and analytics</p>
      </div>

      {/* Statistics Cards */}
      {statistics && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
          <Card>
            <CardHeader className="pb-2">
              <CardDescription>Pending Approvals</CardDescription>
              <CardTitle className="text-3xl flex items-center gap-2">
                <Clock className="w-6 h-6 text-yellow-500" />
                {statistics.pending}
              </CardTitle>
            </CardHeader>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardDescription>Auto-Approval Rate</CardDescription>
              <CardTitle className="text-3xl flex items-center gap-2">
                <TrendingUp className="w-6 h-6 text-green-500" />
                {statistics.auto_approval_rate.toFixed(0)}%
              </CardTitle>
            </CardHeader>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardDescription>Total Orders (30d)</CardDescription>
              <CardTitle className="text-3xl flex items-center gap-2">
                <Users className="w-6 h-6 text-blue-500" />
                {statistics.total_orders}
              </CardTitle>
            </CardHeader>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardDescription>Avg Approval Time</CardDescription>
              <CardTitle className="text-3xl flex items-center gap-2">
                <Clock className="w-6 h-6 text-purple-500" />
                {statistics.avg_approval_time_hours.toFixed(1)}h
              </CardTitle>
            </CardHeader>
          </Card>
        </div>
      )}

      {/* Pending Approvals */}
      <Card>
        <CardHeader>
          <CardTitle>Pending Approvals ({pendingApprovals.length})</CardTitle>
          <CardDescription>Orders requiring manual review</CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="text-center py-8">Loading approvals...</div>
          ) : pendingApprovals.length === 0 ? (
            <div className="text-center py-8">
              <CheckCircle className="w-12 h-12 mx-auto text-green-500 mb-4" />
              <p className="text-gray-600">No pending approvals</p>
            </div>
          ) : (
            <div className="space-y-4">
              {pendingApprovals.map((approval) => (
                <Card key={approval.id} className="hover:shadow-md transition-shadow">
                  <CardContent className="py-4">
                    <div className="flex items-center justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-4 mb-2">
                          <h3 className="font-semibold">Order #{approval.order_id.substring(0, 8)}</h3>
                          {getRiskBadge(approval.risk_score)}
                          {approval.requires_manual_review && (
                            <Badge variant="outline" className="border-orange-500 text-orange-500">
                              <AlertTriangle className="w-3 h-3 mr-1" />
                              Manual Review Required
                            </Badge>
                          )}
                        </div>
                        <div className="grid grid-cols-3 gap-4 text-sm">
                          <div>
                            <span className="text-gray-600">Customer:</span>
                            <p className="font-medium">{approval.customer_email}</p>
                          </div>
                          <div>
                            <span className="text-gray-600">Amount:</span>
                            <p className="font-medium">${approval.total_amount.toFixed(2)}</p>
                          </div>
                          <div>
                            <span className="text-gray-600">Risk Score:</span>
                            <p className="font-medium">{(approval.risk_score * 100).toFixed(0)}%</p>
                          </div>
                        </div>
                        {approval.manual_review_reason && (
                          <div className="mt-2 p-2 bg-yellow-50 rounded text-sm">
                            <span className="font-medium">Reason: </span>
                            {approval.manual_review_reason}
                          </div>
                        )}
                        <p className="text-xs text-gray-500 mt-2">
                          Submitted {new Date(approval.created_at).toLocaleString()}
                        </p>
                      </div>
                      <div className="flex gap-2 ml-4">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setSelectedApproval(approval)}
                        >
                          View Details
                        </Button>
                        <Button
                          variant="default"
                          size="sm"
                          onClick={() => handleApprove(approval.id)}
                          disabled={processing === approval.id}
                        >
                          <CheckCircle className="w-4 h-4 mr-1" />
                          Approve
                        </Button>
                        <Button
                          variant="destructive"
                          size="sm"
                          onClick={() => {
                            const reason = prompt('Enter rejection reason:');
                            if (reason) handleReject(approval.id, reason);
                          }}
                          disabled={processing === approval.id}
                        >
                          <XCircle className="w-4 h-4 mr-1" />
                          Reject
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Approval Details Modal */}
      {selectedApproval && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <Card className="max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <CardHeader>
              <div className="flex justify-between items-start">
                <div>
                  <CardTitle>Order #{selectedApproval.order_id.substring(0, 8)}</CardTitle>
                  <CardDescription>Approval Details</CardDescription>
                </div>
                <Button variant="ghost" onClick={() => setSelectedApproval(null)}>
                  Close
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm font-medium">Customer</label>
                    <p>{selectedApproval.customer_email}</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium">Amount</label>
                    <p>${selectedApproval.total_amount.toFixed(2)}</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium">Risk Score</label>
                    <div className="mt-1">{getRiskBadge(selectedApproval.risk_score)}</div>
                  </div>
                  <div>
                    <label className="text-sm font-medium">Submitted</label>
                    <p>{new Date(selectedApproval.created_at).toLocaleString()}</p>
                  </div>
                </div>
                {selectedApproval.manual_review_reason && (
                  <div>
                    <label className="text-sm font-medium">Review Reason</label>
                    <p className="mt-1 p-3 bg-yellow-50 rounded">
                      {selectedApproval.manual_review_reason}
                    </p>
                  </div>
                )}
                <div className="flex gap-2 pt-4">
                  <Button
                    onClick={() => handleApprove(selectedApproval.id)}
                    disabled={processing === selectedApproval.id}
                    className="flex-1"
                  >
                    <CheckCircle className="w-4 h-4 mr-2" />
                    Approve Order
                  </Button>
                  <Button
                    variant="destructive"
                    onClick={() => {
                      const reason = prompt('Enter rejection reason:');
                      if (reason) handleReject(selectedApproval.id, reason);
                    }}
                    disabled={processing === selectedApproval.id}
                    className="flex-1"
                  >
                    <XCircle className="w-4 h-4 mr-2" />
                    Reject Order
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}

