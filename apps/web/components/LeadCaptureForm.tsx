'use client';

import { useState } from 'react';
import { Button } from '@/components/b2b/Button';
import { Input } from '@/components/b2b/Input';
import { Card } from '@/components/b2b/Card';
import { useToast } from '@/hooks/use-toast';
import { FiSend, FiCheck } from 'react-icons/fi';

/**
 * Lead Capture Form Component
 * Phase 1, Task 3.2: Landing Page Sales Funnel
 * 
 * Captures leads from the landing page and sends them to the API.
 * Provides immediate feedback and confirmation to users.
 */

interface LeadFormData {
  company_name: string;
  contact_name: string;
  email: string;
  phone: string;
  state: string;
  company_size: string;
  industry: string;
  notes: string;
}

const US_STATES = [
  'AL', 'AK', 'AZ', 'AR', 'CA', 'CO', 'CT', 'DE', 'FL', 'GA',
  'HI', 'ID', 'IL', 'IN', 'IA', 'KS', 'KY', 'LA', 'ME', 'MD',
  'MA', 'MI', 'MN', 'MS', 'MO', 'MT', 'NE', 'NV', 'NH', 'NJ',
  'NM', 'NY', 'NC', 'ND', 'OH', 'OK', 'OR', 'PA', 'RI', 'SC',
  'SD', 'TN', 'TX', 'UT', 'VT', 'VA', 'WA', 'WV', 'WI', 'WY'
];

const COMPANY_SIZES = [
  'Small (1-50 employees)',
  'Medium (51-200 employees)',
  'Large (201-1000 employees)',
  'Enterprise (1000+ employees)',
];

const INDUSTRIES = [
  'Restaurant',
  'Catering',
  'Food Service',
  'Hospitality',
  'Healthcare',
  'Education',
  'Other',
];

export function LeadCaptureForm() {
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [formData, setFormData] = useState<LeadFormData>({
    company_name: '',
    contact_name: '',
    email: '',
    phone: '',
    state: '',
    company_size: '',
    industry: '',
    notes: '',
  });

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>
  ) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      const response = await fetch('/api/leads/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          company_name: formData.company_name,
          contact_name: formData.contact_name,
          email: formData.email,
          phone: formData.phone,
          state: formData.state,
          company_size: formData.company_size,
          industry: formData.industry,
          notes: formData.notes,
          source: 'website',
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to submit form');
      }

      setIsSuccess(true);
      toast({
        title: 'Thank you for your interest!',
        description: 'We\'ll be in touch with you shortly.',
      });

      // Reset form
      setFormData({
        company_name: '',
        contact_name: '',
        email: '',
        phone: '',
        state: '',
        company_size: '',
        industry: '',
        notes: '',
      });
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Failed to submit form. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isSuccess) {
    return (
      <Card padding="lg" className="bg-white text-center">
        <div className="flex flex-col items-center gap-4">
          <div className="h-16 w-16 rounded-full bg-b2b-green bg-opacity-10 flex items-center justify-center">
            <FiCheck className="h-8 w-8 text-b2b-green" />
          </div>
          <h3 className="text-2xl font-bold text-b2b-dark">Thank You!</h3>
          <p className="text-b2b-gray-600 max-w-md">
            We&apos;ve received your information and one of our team members will be in touch with you shortly.
          </p>
          <Button
            variant="outline"
            onClick={() => setIsSuccess(false)}
          >
            Submit Another Request
          </Button>
        </div>
      </Card>
    );
  }

  return (
    <Card padding="lg" className="bg-white">
      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="text-center mb-6">
          <h3 className="text-2xl font-bold text-b2b-dark mb-2">
            Get Started Today
          </h3>
          <p className="text-b2b-gray-600">
            Fill out the form below and we&apos;ll reach out to schedule a personalized demo.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Input
            label="Company Name *"
            name="company_name"
            value={formData.company_name}
            onChange={handleChange}
            required
            placeholder="Your Company Name"
          />

          <Input
            label="Your Name *"
            name="contact_name"
            value={formData.contact_name}
            onChange={handleChange}
            required
            placeholder="John Doe"
          />

          <Input
            label="Email *"
            name="email"
            type="email"
            value={formData.email}
            onChange={handleChange}
            required
            placeholder="john@company.com"
          />

          <Input
            label="Phone"
            name="phone"
            type="tel"
            value={formData.phone}
            onChange={handleChange}
            placeholder="(555) 123-4567"
          />

          <div className="w-full">
            <label className="block text-sm font-medium text-b2b-dark mb-1.5">
              State *
            </label>
            <select
              name="state"
              value={formData.state}
              onChange={handleChange}
              required
              className="w-full px-4 py-2.5 border border-b2b-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-b2b-blue focus:border-transparent"
            >
              <option value="">Select State</option>
              {US_STATES.map(state => (
                <option key={state} value={state}>{state}</option>
              ))}
            </select>
          </div>

          <div className="w-full">
            <label className="block text-sm font-medium text-b2b-dark mb-1.5">
              Company Size
            </label>
            <select
              name="company_size"
              value={formData.company_size}
              onChange={handleChange}
              className="w-full px-4 py-2.5 border border-b2b-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-b2b-blue focus:border-transparent"
            >
              <option value="">Select Size</option>
              {COMPANY_SIZES.map(size => (
                <option key={size} value={size}>{size}</option>
              ))}
            </select>
          </div>

          <div className="w-full">
            <label className="block text-sm font-medium text-b2b-dark mb-1.5">
              Industry
            </label>
            <select
              name="industry"
              value={formData.industry}
              onChange={handleChange}
              className="w-full px-4 py-2.5 border border-b2b-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-b2b-blue focus:border-transparent"
            >
              <option value="">Select Industry</option>
              {INDUSTRIES.map(industry => (
                <option key={industry} value={industry}>{industry}</option>
              ))}
            </select>
          </div>
        </div>

        <div className="w-full">
          <label className="block text-sm font-medium text-b2b-dark mb-1.5">
            How can we help you?
          </label>
          <textarea
            name="notes"
            value={formData.notes}
            onChange={handleChange}
            rows={4}
            placeholder="Tell us about your needs..."
            className="w-full px-4 py-2.5 border border-b2b-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-b2b-blue focus:border-transparent resize-none"
          />
        </div>

        <Button
          type="submit"
          variant="primary"
          size="lg"
          icon={<FiSend />}
          disabled={isSubmitting}
          className="w-full"
        >
          {isSubmitting ? 'Submitting...' : 'Request a Demo'}
        </Button>

        <p className="text-xs text-center text-b2b-gray-500">
          By submitting this form, you agree to our Terms of Service and Privacy Policy.
        </p>
      </form>
    </Card>
  );
}

