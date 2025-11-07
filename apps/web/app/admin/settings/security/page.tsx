'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Shield, Key, Download, Copy } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface MFAStatus {
  enabled: boolean;
  backupCodesRemaining: number;
}

interface MFASetupData {
  qrCode: string;
  secret: string;
  backupCodes: string[];
}

export default function SecuritySettingsPage() {
  const [mfaStatus, setMfaStatus] = useState<MFAStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [setupMode, setSetupMode] = useState(false);
  const [mfaSetupData, setMfaSetupData] = useState<MFASetupData | null>(null);
  const [verificationCode, setVerificationCode] = useState('');
  const [disableCode, setDisableCode] = useState('');
  const { toast } = useToast();

  useEffect(() => {
    loadMFAStatus();
  }, []);

  const loadMFAStatus = async () => {
    try {
      const response = await fetch('/api/auth/mfa/status');
      if (response.ok) {
        const data = await response.json();
        setMfaStatus(data);
      }
    } catch (error) {
      console.error('Failed to load MFA status:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSetupMFA = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/auth/mfa/setup', {
        method: 'POST',
      });

      if (!response.ok) {
        const error = await response.json();
        toast({
          title: 'Error',
          description: error.error || 'Failed to set up MFA',
          variant: 'destructive',
        });
        return;
      }

      const data = await response.json();
      setMfaSetupData(data.data);
      setSetupMode(true);
      toast({
        title: 'MFA Setup Started',
        description: 'Scan the QR code with your authenticator app',
      });
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to set up MFA',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyAndEnable = async () => {
    if (!verificationCode || !mfaSetupData) return;

    try {
      setLoading(true);
      const response = await fetch('/api/auth/mfa/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          token: verificationCode,
          secret: mfaSetupData.secret,
          backupCodes: mfaSetupData.backupCodes,
          action: 'setup',
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        toast({
          title: 'Error',
          description: error.error || 'Invalid verification code',
          variant: 'destructive',
        });
        return;
      }

      toast({
        title: 'Success',
        description: 'MFA has been enabled successfully',
      });

      setSetupMode(false);
      setVerificationCode('');
      setMfaSetupData(null);
      loadMFAStatus();
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to verify MFA code',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleDisableMFA = async () => {
    if (!disableCode) return;

    try {
      setLoading(true);
      const response = await fetch('/api/auth/mfa/disable', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token: disableCode }),
      });

      if (!response.ok) {
        const error = await response.json();
        toast({
          title: 'Error',
          description: error.error || 'Failed to disable MFA',
          variant: 'destructive',
        });
        return;
      }

      toast({
        title: 'Success',
        description: 'MFA has been disabled successfully',
      });

      setDisableCode('');
      loadMFAStatus();
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to disable MFA',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const downloadBackupCodes = () => {
    if (!mfaSetupData) return;

    const blob = new Blob(
      [
        'B2B Plus - MFA Backup Codes\n',
        'Keep these codes safe and secure!\n\n',
        mfaSetupData.backupCodes.join('\n'),
      ],
      { type: 'text/plain' }
    );

    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'b2bplus-mfa-backup-codes.txt';
    a.click();
    URL.revokeObjectURL(url);
  };

  const copyBackupCodes = () => {
    if (!mfaSetupData) return;
    navigator.clipboard.writeText(mfaSetupData.backupCodes.join('\n'));
    toast({
      title: 'Copied',
      description: 'Backup codes copied to clipboard',
    });
  };

  if (loading && !mfaStatus) {
    return (
      <div className="container mx-auto py-8">
        <p>Loading...</p>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-8 max-w-4xl">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">Security Settings</h1>
        <p className="text-gray-600">
          Manage your account security and two-factor authentication
        </p>
      </div>

      {/* MFA Status Card */}
      {!setupMode && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Shield className="h-5 w-5" />
              Two-Factor Authentication (2FA)
            </CardTitle>
            <CardDescription>
              Add an extra layer of security to your admin account
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between p-4 border rounded-lg">
              <div>
                <p className="font-medium">
                  Status: {mfaStatus?.enabled ? 'Enabled' : 'Disabled'}
                </p>
                {mfaStatus?.enabled && (
                  <p className="text-sm text-gray-600 mt-1">
                    Backup codes remaining: {mfaStatus.backupCodesRemaining}
                  </p>
                )}
              </div>
              {!mfaStatus?.enabled ? (
                <Button onClick={handleSetupMFA} disabled={loading}>
                  <Key className="h-4 w-4 mr-2" />
                  Enable 2FA
                </Button>
              ) : (
                <div className="space-y-2">
                  <Input
                    type="text"
                    placeholder="Enter verification code"
                    value={disableCode}
                    onChange={(e) => setDisableCode(e.target.value)}
                    className="w-48"
                  />
                  <Button
                    onClick={handleDisableMFA}
                    disabled={loading || !disableCode}
                    variant="destructive"
                  >
                    Disable 2FA
                  </Button>
                </div>
              )}
            </div>

            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <h4 className="font-medium text-blue-900 mb-2">About 2FA</h4>
              <ul className="text-sm text-blue-800 space-y-1 list-disc list-inside">
                <li>Requires a verification code from your authenticator app</li>
                <li>Provides backup codes for emergency access</li>
                <li>Only available for admin accounts</li>
                <li>Can be disabled with a verification code</li>
              </ul>
            </div>
          </CardContent>
        </Card>
      )}

      {/* MFA Setup Card */}
      {setupMode && mfaSetupData && (
        <Card>
          <CardHeader>
            <CardTitle>Set Up Two-Factor Authentication</CardTitle>
            <CardDescription>
              Follow the steps below to enable 2FA on your account
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Step 1: QR Code */}
            <div>
              <h3 className="font-semibold mb-2">Step 1: Scan QR Code</h3>
              <p className="text-sm text-gray-600 mb-4">
                Scan this QR code with your authenticator app (Google Authenticator,
                Authy, etc.)
              </p>
              <div className="flex justify-center p-4 bg-white border rounded-lg">
                <img
                  src={mfaSetupData.qrCode}
                  alt="MFA QR Code"
                  className="w-64 h-64"
                />
              </div>
              <p className="text-xs text-gray-500 mt-2 text-center">
                Can't scan? Manual entry key: {mfaSetupData.secret}
              </p>
            </div>

            {/* Step 2: Backup Codes */}
            <div>
              <h3 className="font-semibold mb-2">Step 2: Save Backup Codes</h3>
              <p className="text-sm text-gray-600 mb-4">
                Save these backup codes in a secure location. You can use them to
                access your account if you lose your authenticator device.
              </p>
              <div className="bg-gray-50 border rounded-lg p-4 font-mono text-sm">
                {mfaSetupData.backupCodes.map((code, index) => (
                  <div key={index} className="py-1">
                    {code}
                  </div>
                ))}
              </div>
              <div className="flex gap-2 mt-2">
                <Button onClick={downloadBackupCodes} variant="outline" size="sm">
                  <Download className="h-4 w-4 mr-2" />
                  Download
                </Button>
                <Button onClick={copyBackupCodes} variant="outline" size="sm">
                  <Copy className="h-4 w-4 mr-2" />
                  Copy
                </Button>
              </div>
            </div>

            {/* Step 3: Verify */}
            <div>
              <h3 className="font-semibold mb-2">Step 3: Verify</h3>
              <p className="text-sm text-gray-600 mb-4">
                Enter the 6-digit code from your authenticator app to complete setup
              </p>
              <div className="space-y-4">
                <div>
                  <Label htmlFor="verification-code">Verification Code</Label>
                  <Input
                    id="verification-code"
                    type="text"
                    placeholder="000000"
                    maxLength={6}
                    value={verificationCode}
                    onChange={(e) => setVerificationCode(e.target.value)}
                    className="max-w-xs"
                  />
                </div>
                <div className="flex gap-2">
                  <Button
                    onClick={handleVerifyAndEnable}
                    disabled={loading || verificationCode.length !== 6}
                  >
                    Verify and Enable
                  </Button>
                  <Button
                    onClick={() => {
                      setSetupMode(false);
                      setMfaSetupData(null);
                      setVerificationCode('');
                    }}
                    variant="outline"
                    disabled={loading}
                  >
                    Cancel
                  </Button>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
