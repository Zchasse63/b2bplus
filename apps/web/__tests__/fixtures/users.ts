export const sampleOrganizations = [
  {
    id: 'org_test_001',
    name: 'Acme Manufacturing',
    business_email: 'contact@acme.com',
    status: 'approved',
    created_at: new Date('2024-01-01').toISOString(),
  },
  {
    id: 'org_test_002',
    name: 'TechCorp Industries',
    business_email: 'info@techcorp.com',
    status: 'approved',
    created_at: new Date('2024-01-15').toISOString(),
  },
];

export const sampleUsers = [
  {
    id: 'user_test_001',
    email: 'john@acme.com',
    name: 'John Doe',
    organization_id: 'org_test_001',
    role: 'customer',
  },
  {
    id: 'user_test_002',
    email: 'jane@techcorp.com',
    name: 'Jane Smith',
    organization_id: 'org_test_002',
    role: 'customer',
  },
  {
    id: 'user_test_003',
    email: 'admin@b2bplus.com',
    name: 'Admin User',
    organization_id: 'org_test_001',
    role: 'admin',
  },
];

export const sampleOrganizationMembers = [
  {
    organization_id: 'org_test_001',
    user_id: 'user_test_001',
    role: 'owner',
  },
  {
    organization_id: 'org_test_002',
    user_id: 'user_test_002',
    role: 'owner',
  },
  {
    organization_id: 'org_test_001',
    user_id: 'user_test_003',
    role: 'admin',
  },
];
