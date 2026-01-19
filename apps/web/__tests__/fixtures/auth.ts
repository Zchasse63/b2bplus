// Test credentials - use TEST_USER_PASSWORD and TEST_ADMIN_PASSWORD from environment in actual tests
// These defaults match .env.example TEST_USER_PASSWORD=TestPassword123! TEST_ADMIN_PASSWORD=AdminPassword123!
export const testUsers = {
  customer: {
    email: 'customer@test.com',
    password: process.env.TEST_USER_PASSWORD || 'TestPassword123!',
    name: 'Test Customer',
    organizationName: 'Test Customer Org',
  },
  admin: {
    email: 'admin@test.com',
    password: process.env.TEST_ADMIN_PASSWORD || 'AdminPassword123!',
    name: 'Test Admin',
    organizationName: 'Test Admin Org',
  },
};

export const magicLinkTokens = {
  valid: 'valid_magic_link_token_123',
  expired: 'expired_magic_link_token_456',
  invalid: 'invalid_magic_link_token_789',
};

export const passwordResetTokens = {
  valid: 'valid_reset_token_abc',
  expired: 'expired_reset_token_def',
  invalid: 'invalid_reset_token_ghi',
};

export const emailTemplates = {
  magicLink: {
    subject: 'Your Magic Link to Sign In',
    body: 'Click the link below to sign in: {{link}}',
  },
  passwordReset: {
    subject: 'Reset Your Password',
    body: 'Click the link below to reset your password: {{link}}',
  },
  welcome: {
    subject: 'Welcome to B2B Plus',
    body: 'Thank you for signing up!',
  },
};
