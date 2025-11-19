'use client';

import { motion } from 'framer-motion';
import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';
import { useRouter } from 'next/navigation';
import { PageHeader } from '@/components/b2b';
import { Card } from '@/components/b2b';
import { Button } from '@/components/b2b';
import { Input } from '@/components/b2b';
import { Modal } from '@/components/b2b';
import { FiUser, FiMail, FiPhone, FiBriefcase, FiSave, FiCheckCircle } from 'react-icons/fi';
import { fadeIn, fast } from '@/lib/animations';
	import CustomerDashboardLayout from '@/components/CustomerDashboardLayout';

interface Profile {
  id: string;
  email: string;
  full_name: string | null;
  phone: string | null;
  avatar_url: string | null;
  current_organization_id: string | null;
}

interface Organization {
  id: string;
  name: string;
  type: string;
  phone: string | null;
  website: string | null;
}

export default function ProfilePage() {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [organization, setOrganization] = useState<Organization | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [successModal, setSuccessModal] = useState(false);
  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState('');
  const supabase = createClient();
  const router = useRouter();

  useEffect(() => {
    loadProfile();
  }, []);

  const loadProfile = async () => {
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) {
        router.push('/auth/login');
        return;
      }

      const { data: profileData, error: profileError } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single();

      if (profileError) throw profileError;
      setProfile(profileData);
      setFullName(profileData.full_name || '');
      setPhone(profileData.phone || '');

      if (profileData.current_organization_id) {
        const { data: orgData, error: orgError } = await supabase
          .from('organizations')
          .select('*')
          .eq('id', profileData.current_organization_id)
          .single();

        if (orgError) throw orgError;
        setOrganization(orgData);
      }
    } catch (error) {
      console.error('Error loading profile:', error);
      alert('Failed to load profile');
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (!profile) return;

    setSaving(true);

    try {
      const { error } = await supabase
        .from('profiles')
        .update({
          full_name: fullName,
          phone: phone,
        })
        .eq('id', profile.id);

      if (error) throw error;

      setProfile({ ...profile, full_name: fullName, phone: phone });
      setSuccessModal(true);
    } catch (error) {
      console.error('Error saving profile:', error);
      alert('Failed to save profile');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <CustomerDashboardLayout>
        <div className="flex h-screen items-center justify-center">
          <div className="text-lg text-b2b-gray-500 dark:text-b2b-gray-500">Loading profile...</div>
        </div>
      </CustomerDashboardLayout>
    );
  }

  if (!profile) {
    return (
      <CustomerDashboardLayout>
        <div className="flex h-screen items-center justify-center">
          <div className="text-lg text-b2b-gray-500 dark:text-b2b-gray-500">Profile not found</div>
        </div>
      </CustomerDashboardLayout>
    );
  }

  return (
    <CustomerDashboardLayout>
      <div className="mt-3">
        {/* Header */}
        <Card padding="lg" className="mb-5">
          <div className="flex items-center gap-4">
            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-gradient-to-br from-brand-400 to-brand-600">
              <FiUser className="h-8 w-8 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-b2b-dark dark:text-white">My Profile</h1>
              <p className="mt-1 text-sm text-b2b-gray-500 dark:text-b2b-gray-500">
                Manage your personal information
              </p>
            </div>
          </div>
        </Card>

        <div className="grid grid-cols-1 gap-5 lg:grid-cols-3">
        {/* Personal Information */}
        <div className="lg:col-span-2">
          <Card padding="lg">
            <h2 className="mb-5 text-xl font-bold text-b2b-dark dark:text-white">
              Personal Information
            </h2>
            <div className="space-y-4">
              <Input
                label="Full Name"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                placeholder="Enter your full name"
                icon={<FiUser />}
              />
              <div>
                <Input
                  label="Email Address"
                  value={profile.email}
                  disabled
                  icon={<FiMail />}
                />
                <p className="mt-1 text-sm text-b2b-gray-500">Email cannot be changed</p>
              </div>
              <Input
                label="Phone Number"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="(555) 123-4567"
                icon={<FiPhone />}
              />
            </div>
            <div className="mt-6 flex justify-end gap-3">
              <Button variant="outline" onClick={() => router.push('/')}>
                Cancel
              </Button>
              <Button variant="primary" icon={<FiSave />} onClick={handleSave} loading={saving}>
                Save Changes
              </Button>
            </div>
          </Card>
        </div>

        {/* Organization Info */}
        <div className="lg:col-span-1">
          {organization ? (
            <Card padding="lg">
              <div className="mb-4 flex items-center gap-3">
                <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-brand-100 dark:bg-brand-900/30">
                  <FiBriefcase className="h-6 w-6 text-b2b-yellow" />
                </div>
                <div>
                  <h2 className="text-lg font-bold text-b2b-dark dark:text-white">Organization</h2>
                </div>
              </div>
              <div className="space-y-3">
                <div>
                  <p className="text-sm text-b2b-gray-500 dark:text-b2b-gray-500">Company Name</p>
                  <p className="font-semibold text-b2b-dark dark:text-white">{organization.name}</p>
                </div>
                <div>
                  <p className="text-sm text-b2b-gray-500 dark:text-b2b-gray-500">Type</p>
                  <p className="font-semibold text-b2b-dark dark:text-white">
                    {organization.type}
                  </p>
                </div>
                {organization.phone && (
                  <div>
                    <p className="text-sm text-b2b-gray-500 dark:text-b2b-gray-500">Phone</p>
                    <p className="font-semibold text-b2b-dark dark:text-white">
                      {organization.phone}
                    </p>
                  </div>
                )}
                {organization.website && (
                  <div>
                    <p className="text-sm text-b2b-gray-500 dark:text-b2b-gray-500">Website</p>
                    <a
                      href={organization.website}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="font-semibold text-b2b-yellow hover:text-brand-600"
                    >
                      {organization.website}
                    </a>
                  </div>
                )}
              </div>
            </Card>
          ) : (
            <Card padding="lg">
              <div className="text-center">
                <FiBriefcase className="mx-auto mb-3 h-12 w-12 text-b2b-gray-500" />
                <p className="text-b2b-gray-500 dark:text-b2b-gray-500">No organization linked</p>
              </div>
            </Card>
          )}
        </div>

        {/* Success Modal */}
        <Modal
          isOpen={successModal}
          onClose={() => setSuccessModal(false)}
          title="Profile Updated!"
          size="sm"
        >
          <div className="space-y-4 text-center">
            <FiCheckCircle className="mx-auto h-16 w-16 text-green-500" />
            <p className="text-gray-700 dark:text-gray-300">
              Your profile has been updated successfully!
            </p>
            <Button variant="primary" className="w-full" onClick={() => setSuccessModal(false)}>
              Continue
            </Button>
          </div>
        </Modal>
      </div>
    </CustomerDashboardLayout>
  );
}
