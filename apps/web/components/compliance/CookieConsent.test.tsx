import React from 'react'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import '@testing-library/jest-dom'
import { CookieConsent, getCookieConsent, isCookieTypeConsented, resetCookieConsent } from './CookieConsent'

// Mock UI components
jest.mock('@/components/ui/button', () => ({
  Button: ({ children, onClick, variant, className }: any) => (
    <button onClick={onClick} className={className} data-variant={variant}>
      {children}
    </button>
  ),
}))

jest.mock('@/components/ui/card', () => ({
  Card: ({ children, className }: any) => (
    <div className={className} data-testid="card">
      {children}
    </div>
  ),
}))

describe('CookieConsent', () => {
  beforeEach(() => {
    // Clear localStorage before each test
    localStorage.clear()
    // Clear cookies
    document.cookie = 'cookie_consent=; max-age=0; path=/'
    jest.clearAllMocks()
  })

  describe('Initial Rendering', () => {
    it('shows banner when no consent is saved', () => {
      render(<CookieConsent />)

      expect(screen.getByText('Cookie Consent')).toBeInTheDocument()
    })

    it('does not show banner when consent is saved', () => {
      localStorage.setItem(
        'b2b_plus_cookie_consent',
        JSON.stringify({ necessary: true, analytics: false, marketing: false, preferences: false })
      )

      render(<CookieConsent />)

      expect(screen.queryByText('Cookie Consent')).not.toBeInTheDocument()
    })

    it('shows banner when saved consent is invalid JSON', () => {
      localStorage.setItem('b2b_plus_cookie_consent', 'invalid json')

      render(<CookieConsent />)

      expect(screen.getByText('Cookie Consent')).toBeInTheDocument()
    })

    it('renders card component', () => {
      render(<CookieConsent />)

      expect(screen.getByTestId('card')).toBeInTheDocument()
    })

    it('renders description text', () => {
      render(<CookieConsent />)

      expect(
        screen.getByText(/We use cookies to enhance your experience/)
      ).toBeInTheDocument()
    })
  })

  describe('Accept All Button', () => {
    it('renders Accept All button', () => {
      render(<CookieConsent />)

      expect(screen.getByRole('button', { name: 'Accept All' })).toBeInTheDocument()
    })

    it('saves all consents when clicked', () => {
      render(<CookieConsent />)

      fireEvent.click(screen.getByRole('button', { name: 'Accept All' }))

      const saved = localStorage.getItem('b2b_plus_cookie_consent')
      expect(saved).toBeTruthy()
      const parsed = JSON.parse(saved!)
      expect(parsed).toEqual({
        necessary: true,
        analytics: true,
        marketing: true,
        preferences: true,
      })
    })

    it('hides banner after accepting all', () => {
      render(<CookieConsent />)

      fireEvent.click(screen.getByRole('button', { name: 'Accept All' }))

      expect(screen.queryByText('Cookie Consent')).not.toBeInTheDocument()
    })

    it('sets cookie when accepting all', () => {
      render(<CookieConsent />)

      fireEvent.click(screen.getByRole('button', { name: 'Accept All' }))

      expect(document.cookie).toContain('cookie_consent=')
    })
  })

  describe('Reject All Button', () => {
    it('renders Reject All button', () => {
      render(<CookieConsent />)

      expect(screen.getByRole('button', { name: 'Reject All' })).toBeInTheDocument()
    })

    it('saves only necessary consent when clicked', () => {
      render(<CookieConsent />)

      fireEvent.click(screen.getByRole('button', { name: 'Reject All' }))

      const saved = localStorage.getItem('b2b_plus_cookie_consent')
      expect(saved).toBeTruthy()
      const parsed = JSON.parse(saved!)
      expect(parsed).toEqual({
        necessary: true,
        analytics: false,
        marketing: false,
        preferences: false,
      })
    })

    it('hides banner after rejecting all', () => {
      render(<CookieConsent />)

      fireEvent.click(screen.getByRole('button', { name: 'Reject All' }))

      expect(screen.queryByText('Cookie Consent')).not.toBeInTheDocument()
    })
  })

  describe('Customize Button', () => {
    it('renders Customize button', () => {
      render(<CookieConsent />)

      expect(screen.getByRole('button', { name: 'Customize' })).toBeInTheDocument()
    })

    it('shows detailed view when clicked', () => {
      render(<CookieConsent />)

      fireEvent.click(screen.getByRole('button', { name: 'Customize' }))

      expect(screen.getByText('Necessary Cookies')).toBeInTheDocument()
      expect(screen.getByText('Analytics Cookies')).toBeInTheDocument()
      expect(screen.getByText('Marketing Cookies')).toBeInTheDocument()
      expect(screen.getByText('Preference Cookies')).toBeInTheDocument()
    })

    it('hides simple view when showing details', () => {
      render(<CookieConsent />)

      fireEvent.click(screen.getByRole('button', { name: 'Customize' }))

      expect(screen.queryByRole('button', { name: 'Accept All' })).not.toBeInTheDocument()
    })
  })

  describe('Detailed Cookie Settings', () => {
    beforeEach(() => {
      render(<CookieConsent />)
      fireEvent.click(screen.getByRole('button', { name: 'Customize' }))
    })

    it('necessary cookies checkbox is checked and disabled', () => {
      const checkbox = screen.getByLabelText('Necessary Cookies') as HTMLInputElement
      expect(checkbox).toBeChecked()
      expect(checkbox).toBeDisabled()
    })

    it('analytics cookies checkbox is unchecked by default', () => {
      const checkbox = screen.getByLabelText('Analytics Cookies') as HTMLInputElement
      expect(checkbox).not.toBeChecked()
    })

    it('marketing cookies checkbox is unchecked by default', () => {
      const checkbox = screen.getByLabelText('Marketing Cookies') as HTMLInputElement
      expect(checkbox).not.toBeChecked()
    })

    it('preferences cookies checkbox is unchecked by default', () => {
      const checkbox = screen.getByLabelText('Preference Cookies') as HTMLInputElement
      expect(checkbox).not.toBeChecked()
    })

    it('can toggle analytics cookies', () => {
      const checkbox = screen.getByLabelText('Analytics Cookies') as HTMLInputElement

      fireEvent.click(checkbox)
      expect(checkbox).toBeChecked()

      fireEvent.click(checkbox)
      expect(checkbox).not.toBeChecked()
    })

    it('can toggle marketing cookies', () => {
      const checkbox = screen.getByLabelText('Marketing Cookies') as HTMLInputElement

      fireEvent.click(checkbox)
      expect(checkbox).toBeChecked()
    })

    it('can toggle preference cookies', () => {
      const checkbox = screen.getByLabelText('Preference Cookies') as HTMLInputElement

      fireEvent.click(checkbox)
      expect(checkbox).toBeChecked()
    })

    it('shows cookie descriptions', () => {
      expect(screen.getByText(/Required for basic site functionality/)).toBeInTheDocument()
      expect(screen.getByText(/Help us understand how you use our site/)).toBeInTheDocument()
      expect(screen.getByText(/Used to track your activity/)).toBeInTheDocument()
      expect(screen.getByText(/Remember your preferences and settings/)).toBeInTheDocument()
    })
  })

  describe('Save Preferences Button', () => {
    beforeEach(() => {
      render(<CookieConsent />)
      fireEvent.click(screen.getByRole('button', { name: 'Customize' }))
    })

    it('renders Save Preferences button', () => {
      expect(screen.getByRole('button', { name: 'Save Preferences' })).toBeInTheDocument()
    })

    it('saves custom preferences when clicked', () => {
      const analyticsCheckbox = screen.getByLabelText('Analytics Cookies')
      fireEvent.click(analyticsCheckbox)

      fireEvent.click(screen.getByRole('button', { name: 'Save Preferences' }))

      const saved = localStorage.getItem('b2b_plus_cookie_consent')
      const parsed = JSON.parse(saved!)
      expect(parsed.analytics).toBe(true)
      expect(parsed.marketing).toBe(false)
    })

    it('hides banner after saving preferences', () => {
      fireEvent.click(screen.getByRole('button', { name: 'Save Preferences' }))

      expect(screen.queryByText('Cookie Consent')).not.toBeInTheDocument()
    })
  })

  describe('Back Button', () => {
    beforeEach(() => {
      render(<CookieConsent />)
      fireEvent.click(screen.getByRole('button', { name: 'Customize' }))
    })

    it('renders Back button in detailed view', () => {
      expect(screen.getByRole('button', { name: 'Back' })).toBeInTheDocument()
    })

    it('returns to simple view when clicked', () => {
      fireEvent.click(screen.getByRole('button', { name: 'Back' }))

      expect(screen.getByRole('button', { name: 'Accept All' })).toBeInTheDocument()
      expect(screen.queryByText('Necessary Cookies')).not.toBeInTheDocument()
    })
  })

  describe('Privacy Links', () => {
    it('renders Privacy Policy link', () => {
      render(<CookieConsent />)

      const link = screen.getByRole('link', { name: 'Privacy Policy' })
      expect(link).toBeInTheDocument()
      expect(link).toHaveAttribute('href', '/privacy-policy')
    })

    it('renders Cookie Policy link', () => {
      render(<CookieConsent />)

      const link = screen.getByRole('link', { name: 'Cookie Policy' })
      expect(link).toBeInTheDocument()
      expect(link).toHaveAttribute('href', '/cookie-policy')
    })
  })

  describe('getCookieConsent Helper', () => {
    it('returns null when no consent is saved', () => {
      const consent = getCookieConsent()
      expect(consent).toBeNull()
    })

    it('returns saved consent', () => {
      const savedConsent = {
        necessary: true,
        analytics: true,
        marketing: false,
        preferences: true,
      }
      localStorage.setItem('b2b_plus_cookie_consent', JSON.stringify(savedConsent))

      const consent = getCookieConsent()
      expect(consent).toEqual(savedConsent)
    })

    it('returns null for invalid JSON', () => {
      localStorage.setItem('b2b_plus_cookie_consent', 'invalid')

      const consent = getCookieConsent()
      expect(consent).toBeNull()
    })
  })

  describe('isCookieTypeConsented Helper', () => {
    it('returns false when no consent is saved', () => {
      expect(isCookieTypeConsented('analytics')).toBe(false)
    })

    it('returns true for consented cookie type', () => {
      localStorage.setItem(
        'b2b_plus_cookie_consent',
        JSON.stringify({ necessary: true, analytics: true, marketing: false, preferences: false })
      )

      expect(isCookieTypeConsented('analytics')).toBe(true)
    })

    it('returns false for non-consented cookie type', () => {
      localStorage.setItem(
        'b2b_plus_cookie_consent',
        JSON.stringify({ necessary: true, analytics: false, marketing: false, preferences: false })
      )

      expect(isCookieTypeConsented('marketing')).toBe(false)
    })

    it('returns true for necessary cookies', () => {
      localStorage.setItem(
        'b2b_plus_cookie_consent',
        JSON.stringify({ necessary: true, analytics: false, marketing: false, preferences: false })
      )

      expect(isCookieTypeConsented('necessary')).toBe(true)
    })
  })

  describe('resetCookieConsent Helper', () => {
    it('removes consent from localStorage', () => {
      localStorage.setItem(
        'b2b_plus_cookie_consent',
        JSON.stringify({ necessary: true, analytics: true, marketing: true, preferences: true })
      )

      resetCookieConsent()

      expect(localStorage.getItem('b2b_plus_cookie_consent')).toBeNull()
    })

    it('removes consent cookie', () => {
      document.cookie = 'cookie_consent=test; path=/'

      resetCookieConsent()

      expect(document.cookie).not.toContain('cookie_consent=test')
    })
  })
})

