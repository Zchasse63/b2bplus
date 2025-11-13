'use client';

import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';

export interface CookieConsent {
  necessary: boolean;
  analytics: boolean;
  marketing: boolean;
  preferences: boolean;
}

const COOKIE_CONSENT_KEY = 'b2b_plus_cookie_consent';
const COOKIE_CONSENT_EXPIRY = 365 * 24 * 60 * 60 * 1000; // 1 year

/**
 * Cookie Consent Component
 * Manages user consent for different cookie categories
 */
export function CookieConsent() {
  const [showBanner, setShowBanner] = useState(false);
  const [showDetails, setShowDetails] = useState(false);
  const [consent, setConsent] = useState<CookieConsent>({
    necessary: true, // Always required
    analytics: false,
    marketing: false,
    preferences: false,
  });

  // Check if user has already given consent
  useEffect(() => {
    const savedConsent = localStorage.getItem(COOKIE_CONSENT_KEY);
    if (!savedConsent) {
      setShowBanner(true);
    } else {
      try {
        const parsed = JSON.parse(savedConsent);
        setConsent(parsed);
      } catch {
        setShowBanner(true);
      }
    }
  }, []);

  // Save consent to localStorage and cookies
  const saveConsent = (newConsent: CookieConsent) => {
    setConsent(newConsent);
    localStorage.setItem(COOKIE_CONSENT_KEY, JSON.stringify(newConsent));

    // Set cookie for server-side access
    document.cookie = `cookie_consent=${JSON.stringify(newConsent)}; max-age=${COOKIE_CONSENT_EXPIRY / 1000}; path=/; SameSite=Strict`;

    // Load analytics if consented
    if (newConsent.analytics) {
      loadAnalytics();
    }

    // Load marketing if consented
    if (newConsent.marketing) {
      loadMarketing();
    }

    setShowBanner(false);
  };

  // Accept all cookies
  const handleAcceptAll = () => {
    saveConsent({
      necessary: true,
      analytics: true,
      marketing: true,
      preferences: true,
    });
  };

  // Reject all non-essential cookies
  const handleRejectAll = () => {
    saveConsent({
      necessary: true,
      analytics: false,
      marketing: false,
      preferences: false,
    });
  };

  // Save custom preferences
  const handleSavePreferences = () => {
    saveConsent(consent);
  };

  if (!showBanner) {
    return null;
  }

  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 bg-black/50 backdrop-blur-sm">
      <Card className="m-4 max-w-2xl mx-auto">
        <div className="p-6">
          <h2 className="text-lg font-semibold mb-2">Cookie Consent</h2>

          {!showDetails ? (
            <>
              <p className="text-sm text-gray-600 mb-4">
                We use cookies to enhance your experience, analyze site traffic, and serve targeted
                advertisements. By clicking &quot;Accept All&quot;, you consent to our use of cookies.
              </p>

              <div className="flex gap-3 flex-wrap">
                <Button
                  onClick={handleAcceptAll}
                  className="bg-blue-600 hover:bg-blue-700"
                >
                  Accept All
                </Button>
                <Button
                  onClick={handleRejectAll}
                  variant="outline"
                >
                  Reject All
                </Button>
                <Button
                  onClick={() => setShowDetails(true)}
                  variant="outline"
                >
                  Customize
                </Button>
              </div>

              <p className="text-xs text-gray-500 mt-4">
                <a href="/privacy-policy" className="underline hover:no-underline">
                  Privacy Policy
                </a>
                {' '} | {' '}
                <a href="/cookie-policy" className="underline hover:no-underline">
                  Cookie Policy
                </a>
              </p>
            </>
          ) : (
            <>
              <div className="space-y-4 mb-4">
                {/* Necessary Cookies */}
                <div className="flex items-start gap-3">
                  <input
                    type="checkbox"
                    id="necessary"
                    checked={true}
                    disabled
                    className="mt-1"
                  />
                  <div className="flex-1">
                    <label htmlFor="necessary" className="font-medium text-sm">
                      Necessary Cookies
                    </label>
                    <p className="text-xs text-gray-600">
                      Required for basic site functionality. Cannot be disabled.
                    </p>
                  </div>
                </div>

                {/* Analytics Cookies */}
                <div className="flex items-start gap-3">
                  <input
                    type="checkbox"
                    id="analytics"
                    checked={consent.analytics}
                    onChange={(e) =>
                      setConsent({ ...consent, analytics: e.target.checked })
                    }
                    className="mt-1"
                  />
                  <div className="flex-1">
                    <label htmlFor="analytics" className="font-medium text-sm">
                      Analytics Cookies
                    </label>
                    <p className="text-xs text-gray-600">
                      Help us understand how you use our site to improve your experience.
                    </p>
                  </div>
                </div>

                {/* Marketing Cookies */}
                <div className="flex items-start gap-3">
                  <input
                    type="checkbox"
                    id="marketing"
                    checked={consent.marketing}
                    onChange={(e) =>
                      setConsent({ ...consent, marketing: e.target.checked })
                    }
                    className="mt-1"
                  />
                  <div className="flex-1">
                    <label htmlFor="marketing" className="font-medium text-sm">
                      Marketing Cookies
                    </label>
                    <p className="text-xs text-gray-600">
                      Used to track your activity and show you relevant advertisements.
                    </p>
                  </div>
                </div>

                {/* Preference Cookies */}
                <div className="flex items-start gap-3">
                  <input
                    type="checkbox"
                    id="preferences"
                    checked={consent.preferences}
                    onChange={(e) =>
                      setConsent({ ...consent, preferences: e.target.checked })
                    }
                    className="mt-1"
                  />
                  <div className="flex-1">
                    <label htmlFor="preferences" className="font-medium text-sm">
                      Preference Cookies
                    </label>
                    <p className="text-xs text-gray-600">
                      Remember your preferences and settings for a personalized experience.
                    </p>
                  </div>
                </div>
              </div>

              <div className="flex gap-3 flex-wrap">
                <Button
                  onClick={handleSavePreferences}
                  className="bg-blue-600 hover:bg-blue-700"
                >
                  Save Preferences
                </Button>
                <Button
                  onClick={() => setShowDetails(false)}
                  variant="outline"
                >
                  Back
                </Button>
              </div>
            </>
          )}
        </div>
      </Card>
    </div>
  );
}

/**
 * Load analytics scripts
 */
function loadAnalytics() {
  // Load Google Analytics or similar
  if (typeof window !== 'undefined' && !window.gtag) {
    const script = document.createElement('script');
    script.async = true;
    script.src = `https://www.googletagmanager.com/gtag/js?id=${process.env.NEXT_PUBLIC_GA_ID}`;
    document.head.appendChild(script);

    window.dataLayer = window.dataLayer || [];
    const gtag = (...args: any[]) => {
      (window.dataLayer as any[]).push(args);
    };
    window.gtag = gtag;
    gtag('js', new Date());
    gtag('config', process.env.NEXT_PUBLIC_GA_ID);
  }
}

/**
 * Load marketing scripts
 */
function loadMarketing() {
  // Load marketing pixels and scripts
  // Example: Facebook Pixel, LinkedIn Insight Tag, etc.
}

/**
 * Get current cookie consent
 */
export function getCookieConsent(): CookieConsent | null {
  if (typeof window === 'undefined') return null;

  const saved = localStorage.getItem(COOKIE_CONSENT_KEY);
  if (!saved) return null;

  try {
    return JSON.parse(saved);
  } catch {
    return null;
  }
}

/**
 * Check if specific cookie type is consented
 */
export function isCookieTypeConsented(type: keyof CookieConsent): boolean {
  const consent = getCookieConsent();
  if (!consent) return false;
  return consent[type];
}

/**
 * Reset cookie consent
 */
export function resetCookieConsent(): void {
  if (typeof window !== 'undefined') {
    localStorage.removeItem(COOKIE_CONSENT_KEY);
    document.cookie = 'cookie_consent=; max-age=0; path=/';
  }
}

// Extend window interface for TypeScript
declare global {
  interface Window {
    gtag?: (...args: any[]) => void;
    dataLayer?: any[];
  }
}

