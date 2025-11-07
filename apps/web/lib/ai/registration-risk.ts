import { generateJSON, getFlashModel } from '@/lib/gemini';

/**
 * AI Risk Assessment for Customer Registrations
 * Phase 4, Task 5.3: AI Risk Assessment Integration
 *
 * Uses Gemini AI to analyze new customer registrations and assess risk levels
 */

interface RegistrationData {
  company_name: string;
  email: string;
  phone?: string;
  industry?: string;
  company_size?: string;
  website?: string;
  tax_id?: string;
  billing_address?: any;
  shipping_address?: any;
}

interface RiskAssessment {
  risk_level: 'low' | 'medium' | 'high';
  risk_score: number; // 0-100
  risk_factors: string[];
  positive_indicators: string[];
  recommendations: string[];
  fraud_indicators: string[];
  business_legitimacy_score: number; // 0-100
  credit_risk_score: number; // 0-100
  overall_assessment: string;
}

/**
 * Assess registration risk using AI
 */
export async function assessRegistrationRisk(
  registration: RegistrationData
): Promise<RiskAssessment> {
  try {
    const prompt = `You are an expert fraud detection and business risk assessment AI. Analyze the following customer registration and provide a comprehensive risk assessment.

Registration Details:
- Company Name: ${registration.company_name}
- Email: ${registration.email}
- Phone: ${registration.phone || 'Not provided'}
- Industry: ${registration.industry || 'Not provided'}
- Company Size: ${registration.company_size || 'Not provided'}
- Website: ${registration.website || 'Not provided'}
- Tax ID: ${registration.tax_id ? 'Provided' : 'Not provided'}
- Billing Address: ${registration.billing_address ? JSON.stringify(registration.billing_address) : 'Not provided'}
- Shipping Address: ${registration.shipping_address ? JSON.stringify(registration.shipping_address) : 'Not provided'}

Analyze the registration for:
1. Fraud indicators (fake emails, suspicious patterns, incomplete information)
2. Business legitimacy (professional email domain, complete information, valid website)
3. Credit risk factors (industry risk, company size, location)
4. Data completeness and quality

Provide your assessment in the following JSON format:
{
  "risk_level": "low" | "medium" | "high",
  "risk_score": 0-100 (0 = no risk, 100 = maximum risk),
  "risk_factors": ["list of concerning factors"],
  "positive_indicators": ["list of positive signs"],
  "recommendations": ["list of recommended actions"],
  "fraud_indicators": ["list of potential fraud signals"],
  "business_legitimacy_score": 0-100 (0 = likely fake, 100 = highly legitimate),
  "credit_risk_score": 0-100 (0 = low risk, 100 = high risk),
  "overall_assessment": "brief summary of the assessment"
}

Risk Level Guidelines:
- LOW: Professional business with complete information, legitimate indicators, minimal concerns
- MEDIUM: Some missing information or minor concerns, but generally acceptable
- HIGH: Multiple red flags, incomplete information, suspicious patterns, or fraud indicators`;

    const result = await generateJSON<RiskAssessment>(prompt);

    if (!result) {
      // Fallback assessment if AI fails
      return {
        risk_level: 'medium',
        risk_score: 50,
        risk_factors: ['Unable to complete AI assessment'],
        positive_indicators: [],
        recommendations: ['Manual review required'],
        fraud_indicators: [],
        business_legitimacy_score: 50,
        credit_risk_score: 50,
        overall_assessment: 'AI assessment unavailable - manual review required',
      };
    }

    return result;
  } catch (error) {
    console.error('Error in AI risk assessment:', error);

    // Fallback assessment on error
    return {
      risk_level: 'medium',
      risk_score: 50,
      risk_factors: ['AI assessment failed'],
      positive_indicators: [],
      recommendations: ['Manual review required due to assessment error'],
      fraud_indicators: [],
      business_legitimacy_score: 50,
      credit_risk_score: 50,
      overall_assessment: 'Assessment error - manual review required',
    };
  }
}

/**
 * Batch assess multiple registrations
 */
export async function batchAssessRegistrations(
  registrations: RegistrationData[]
): Promise<Map<string, RiskAssessment>> {
  const assessments = new Map<string, RiskAssessment>();

  // Process in parallel with a limit to avoid rate limiting
  const batchSize = 5;
  for (let i = 0; i < registrations.length; i += batchSize) {
    const batch = registrations.slice(i, i + batchSize);
    const results = await Promise.all(
      batch.map((reg) => assessRegistrationRisk(reg))
    );

    batch.forEach((reg, index) => {
      assessments.set(reg.email, results[index]);
    });
  }

  return assessments;
}

/**
 * Get risk level color for UI display
 */
export function getRiskLevelColor(riskLevel: string): string {
  switch (riskLevel) {
    case 'low':
      return 'green';
    case 'medium':
      return 'yellow';
    case 'high':
      return 'red';
    default:
      return 'gray';
  }
}

/**
 * Get risk level badge text
 */
export function getRiskLevelBadge(riskLevel: string): string {
  switch (riskLevel) {
    case 'low':
      return 'Low Risk';
    case 'medium':
      return 'Medium Risk';
    case 'high':
      return 'High Risk';
    default:
      return 'Unknown';
  }
}

/**
 * Determine if registration should be auto-approved based on risk assessment
 */
export function shouldAutoApprove(assessment: RiskAssessment): boolean {
  return (
    assessment.risk_level === 'low' &&
    assessment.risk_score < 20 &&
    assessment.business_legitimacy_score > 80 &&
    assessment.fraud_indicators.length === 0
  );
}

/**
 * Determine if registration should be auto-rejected based on risk assessment
 */
export function shouldAutoReject(assessment: RiskAssessment): boolean {
  return (
    assessment.risk_level === 'high' &&
    assessment.risk_score > 80 &&
    assessment.fraud_indicators.length > 2
  );
}

