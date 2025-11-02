# Magic Link Authentication Research

**Source:** FusionAuth - Magic Links Guide
**Date:** November 1, 2025

## What Are Magic Links?

A magic link is a **URL with an embedded unique token**. Clicking on the link authenticates the user, allowing them to access a particular service or application. It is similar in function to a one-time password (OTP) setup but with less risk.

Magic links are a straightforward alternative to usernames and passwords. Instead of asking users to create and remember credentials, we send a one-time-use link or code to their registered email account or phone number.

**Key Characteristics:**
- Unique token per link
- Cannot be used by anyone else
- Cannot be lost (recoverable from servers)
- Temporary (expires after use or set period)
- First introduced around 2010
- Adopted by major players (Facebook, Microsoft)

---

## How Magic Link Authentication Works

### Email-Based Flow:

1. **User Login Request:** User enters their email address
2. **Token Generation:** Backend generates a unique token
3. **Magic Link Email:** Token is embedded into a URL and emailed to user
4. **User Clicks Link:** User authenticates by clicking the link
5. **Token Validation:** Backend validates token, logs in user, invalidates token

### Phone-Based Flow:

1. **User Login Request:** User enters their phone number
2. **Code Generation:** Backend generates a short, one-time code
3. **SMS Sent:** Code is sent via SMS
4. **User Enters Code:** User enters code into login form
5. **Code Validation:** Backend validates code, logs in user, invalidates code

---

## Benefits of Magic Links

### 1. Improved User Experience
- **No password to remember** - Users only need access to email/phone
- **No password resets** - Eliminates frequent password reset frustration
- **Simplified login** - One click to authenticate
- **Higher engagement rates** - Frictionless login increases user activity

### 2. Enhanced Security
- **No password reuse** - Eliminates risk of password theft across platforms
- **No weak passwords** - Users can't choose easy-to-guess passwords
- **Temporary tokens** - Each link expires after use or set period
- **Email/phone security** - Leverages existing 2FA on email accounts
- **No password storage** - Eliminates vulnerabilities of password databases

### 3. Easier Implementation
- **Simpler codebase** - Fewer lines of code than comprehensive password system
- **No password storage** - No encryption, hashing, or secure storage needed
- **No password reset flow** - Eliminates complex password recovery logic
- **Fewer resources** - Easier to implement than 2FA or hardware tokens

---

## Considerations & Risks

### 1. Email/Phone Security Dependency
**Risk:** If user's email account or phone number is compromised, all services using magic links are at risk.

**Mitigation:**
- Encourage users to protect email accounts with 2FA
- Keep magic link lifetime low (5-15 minutes)
- Monitor for suspicious login patterns
- Consider additional verification for high-risk actions

### 2. Phishing Attacks
**Risk:** Users might be tricked into clicking malicious links masquerading as magic links.

**Mitigation:**
- Train users to identify genuine magic links
- Use consistent branding in emails
- Display sender domain clearly
- Include security warnings in emails
- Use short-lived tokens

### 3. Email Pre-Fetching
**Risk:** Some email providers pre-fetch all links in emails, which may expire magic links prematurely.

**Mitigation:**
- Implement token validation that allows multiple clicks
- Use longer expiration times
- Track token usage patterns
- Provide fallback authentication method

### 4. SMS Vulnerabilities
**Risk:** Phone numbers can be compromised via SIM swapping or carrier attacks.

**Mitigation:**
- Prefer email over SMS when possible
- Require additional verification for phone number changes
- Monitor for suspicious phone number updates
- Consider using SMS only as backup method

---

## Implementation Best Practices

### 1. Token Generation
- Use cryptographically secure random tokens
- Make tokens long enough to prevent brute force (32+ characters)
- Include timestamp in token data
- Sign tokens to prevent tampering

### 2. Token Expiration
- Set short expiration times (5-15 minutes for email, 2-5 minutes for SMS)
- Invalidate token after first use
- Clean up expired tokens from database
- Allow users to request new links if expired

### 3. Security Measures
- Use HTTPS for all magic link URLs
- Validate token server-side (never client-side)
- Rate limit magic link requests (prevent abuse)
- Log all authentication attempts
- Monitor for suspicious patterns

### 4. User Experience
- Provide clear instructions in email/SMS
- Use recognizable sender name and branding
- Include fallback options (resend link, contact support)
- Show loading state after clicking link
- Provide feedback on success/failure

### 5. Email/SMS Content
- Use clear, concise subject lines
- Include company branding
- Explain what the link is for
- Add security warnings (don't share link)
- Include expiration time
- Provide support contact

---

## Magic Links vs. Passwords

| Aspect | Passwords | Magic Links |
|--------|-----------|-------------|
| **User Experience** | Must remember complex passwords | One-click authentication |
| **Security** | Vulnerable to reuse, theft, weak passwords | Unique, temporary, tied to email/phone |
| **Implementation** | Complex (storage, encryption, resets) | Simpler codebase |
| **Maintenance** | Password resets, account recovery | Minimal maintenance |
| **Vulnerabilities** | Password databases, brute force | Email/phone compromise |
| **User Friction** | High (forgotten passwords) | Low (no passwords to remember) |

---

## When to Use Magic Links

**✅ Good Use Cases:**
- B2B platforms with infrequent logins
- E-commerce checkout flows
- Newsletter subscriptions
- Content access (articles, videos)
- Account recovery
- Temporary access grants

**⚠️ Consider Alternatives:**
- High-security applications (banking, healthcare)
- Frequent logins (multiple times per day)
- Users without reliable email/phone access
- Real-time applications (chat, gaming)

---

## Implementation for B2B+ Platform

### Recommended Approach:

**1. Default to Magic Links**
- Primary authentication method
- Email-based for most users
- Phone-based as backup option

**2. Allow Password Option**
- Users can opt-in to password authentication
- Useful for frequent users
- Store passwords securely if enabled

**3. Auto-Account Creation for Leads**
- When sending promotional emails to leads
- Generate account with magic link
- User clicks link → instant access with pricing
- No signup friction

**4. Magic Link Flow:**
```
Lead receives promotional email
↓
Email contains magic link
↓
User clicks link
↓
Backend validates token
↓
Auto-login + redirect to offer page
↓
User sees pricing immediately
```

**5. Security Measures:**
- 10-minute expiration for magic links
- Rate limit: 3 magic links per email per hour
- HTTPS only
- Log all authentication attempts
- Monitor for suspicious patterns

---

## Technical Implementation

### Database Schema:
```sql
CREATE TABLE magic_link_tokens (
  id UUID PRIMARY KEY,
  user_id UUID REFERENCES users(id),
  token TEXT UNIQUE NOT NULL,
  email TEXT NOT NULL,
  expires_at TIMESTAMP NOT NULL,
  used_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW()
);
```

### API Endpoints:
- `POST /api/auth/magic-link/request` - Request magic link
- `GET /api/auth/magic-link/verify?token=xxx` - Verify and login
- `POST /api/auth/magic-link/resend` - Resend magic link

### Email Template:
```
Subject: Your login link for B2B+

Hi [Name],

Click the link below to log in to your B2B+ account:

[Magic Link Button]

This link expires in 10 minutes and can only be used once.

If you didn't request this, please ignore this email.

Need help? Contact support@b2bplus.com

---
B2B+ Team
```

---

## Key Takeaways

1. **Magic links simplify authentication** - No passwords to remember
2. **Security depends on email/phone security** - Encourage users to protect accounts
3. **Implementation is simpler than passwords** - Less code, fewer vulnerabilities
4. **Perfect for B2B lead onboarding** - Frictionless access to promotional offers
5. **Use short expiration times** - 5-15 minutes for security
6. **Monitor for abuse** - Rate limiting and logging essential
7. **Provide fallback options** - Resend link, contact support

---

*This research will inform the implementation of magic link authentication in the B2B+ platform.*
