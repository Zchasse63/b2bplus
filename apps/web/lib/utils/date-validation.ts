/**
 * Date Validation Utilities
 * Handles timezone-aware date comparisons for pricing and promotions
 */

import { parseISO, isAfter, isBefore, isEqual, startOfDay, endOfDay } from 'date-fns';
import { utcToZonedTime, zonedTimeToUtc } from 'date-fns-tz';

/**
 * Convert UTC date string to a specific timezone
 */
export function convertToTimezone(utcDate: string | Date, timezone: string = 'UTC'): Date {
  try {
    const date = typeof utcDate === 'string' ? parseISO(utcDate) : utcDate;
    return utcToZonedTime(date, timezone);
  } catch (error) {
    console.error('Error converting timezone:', error);
    return new Date(utcDate);
  }
}

/**
 * Convert a date in a specific timezone to UTC
 */
export function convertToUTC(date: Date, timezone: string = 'UTC'): Date {
  try {
    return zonedTimeToUtc(date, timezone);
  } catch (error) {
    console.error('Error converting to UTC:', error);
    return date;
  }
}

/**
 * Check if a date is within a valid range (timezone-aware)
 */
export function isDateInRange(
  dateToCheck: string | Date,
  startDate: string | Date,
  endDate: string | Date,
  timezone: string = 'UTC'
): boolean {
  try {
    const checkDate = convertToTimezone(dateToCheck, timezone);
    const start = convertToTimezone(startDate, timezone);
    const end = convertToTimezone(endDate, timezone);

    return (isAfter(checkDate, start) || isEqual(checkDate, start)) &&
           (isBefore(checkDate, end) || isEqual(checkDate, end));
  } catch (error) {
    console.error('Error checking date range:', error);
    return false;
  }
}

/**
 * Check if a promotion/pricing is currently active
 */
export function isPricingActive(
  startDate: string | Date | null,
  endDate: string | Date | null,
  timezone: string = 'UTC'
): boolean {
  const now = new Date();

  // If no start date, it's always started
  if (!startDate) {
    // If there's an end date, check if we're before it
    if (endDate) {
      return isBefore(now, convertToTimezone(endDate, timezone));
    }
    return true;
  }

  // If no end date, it's always active after start
  if (!endDate) {
    return isAfter(now, convertToTimezone(startDate, timezone)) ||
           isEqual(now, convertToTimezone(startDate, timezone));
  }

  // Both dates exist, check range
  return isDateInRange(now, startDate, endDate, timezone);
}

/**
 * Check if a date has passed (expiration check)
 */
export function hasDatePassed(date: string | Date, timezone: string = 'UTC'): boolean {
  try {
    const convertedDate = convertToTimezone(date, timezone);
    return isBefore(convertedDate, new Date());
  } catch (error) {
    console.error('Error checking if date passed:', error);
    return true; // Assume expired on error
  }
}

/**
 * Check if a date is upcoming (in the future)
 */
export function isDateUpcoming(date: string | Date, timezone: string = 'UTC'): boolean {
  try {
    const convertedDate = convertToTimezone(date, timezone);
    return isAfter(convertedDate, new Date());
  } catch (error) {
    console.error('Error checking if date is upcoming:', error);
    return false;
  }
}

/**
 * Get the start of day in a specific timezone
 */
export function getStartOfDay(date: Date, timezone: string = 'UTC'): Date {
  try {
    const convertedDate = convertToTimezone(date, timezone);
    return startOfDay(convertedDate);
  } catch (error) {
    console.error('Error getting start of day:', error);
    return startOfDay(date);
  }
}

/**
 * Get the end of day in a specific timezone
 */
export function getEndOfDay(date: Date, timezone: string = 'UTC'): Date {
  try {
    const convertedDate = convertToTimezone(date, timezone);
    return endOfDay(convertedDate);
  } catch (error) {
    console.error('Error getting end of day:', error);
    return endOfDay(date);
  }
}

/**
 * Validate that start date is before end date
 */
export function isValidDateRange(
  startDate: string | Date,
  endDate: string | Date,
  timezone: string = 'UTC'
): boolean {
  try {
    const start = convertToTimezone(startDate, timezone);
    const end = convertToTimezone(endDate, timezone);
    return isBefore(start, end);
  } catch (error) {
    console.error('Error validating date range:', error);
    return false;
  }
}

/**
 * Get all pricing expiring soon (within X days)
 */
export function getPricingExpiringWithin(
  endDate: string | Date,
  daysThreshold: number = 7,
  timezone: string = 'UTC'
): boolean {
  try {
    const convertedDate = convertToTimezone(endDate, timezone);
    const now = new Date();
    const thresholdDate = new Date(now.getTime() + daysThreshold * 24 * 60 * 60 * 1000);

    return isBefore(convertedDate, thresholdDate) && isAfter(convertedDate, now);
  } catch (error) {
    console.error('Error checking expiring pricing:', error);
    return false;
  }
}

/**
 * Format date for display with timezone
 */
export function formatDateWithTimezone(
  date: string | Date,
  timezone: string = 'UTC',
  format: string = 'PPp'
): string {
  try {
    const { format: formatFns } = require('date-fns');
    const convertedDate = convertToTimezone(date, timezone);
    return formatFns(convertedDate, format);
  } catch (error) {
    console.error('Error formatting date:', error);
    return new Date(date).toString();
  }
}

/**
 * Validate pricing dates for database insertion
 */
export interface PricingDateValidation {
  isValid: boolean;
  errors: string[];
}

export function validatePricingDates(
  startDate: string | Date | null,
  endDate: string | Date | null,
  timezone: string = 'UTC'
): PricingDateValidation {
  const errors: string[] = [];

  // Check if dates are valid ISO strings or Date objects
  try {
    if (startDate && typeof startDate === 'string') {
      parseISO(startDate);
    }
    if (endDate && typeof endDate === 'string') {
      parseISO(endDate);
    }
  } catch (error) {
    errors.push('Invalid date format. Use ISO 8601 format.');
  }

  // Check if both dates are provided
  if (startDate && endDate) {
    if (!isValidDateRange(startDate, endDate, timezone)) {
      errors.push('Start date must be before end date.');
    }
  }

  // Check if start date is in the future (for scheduled pricing)
  if (startDate) {
    try {
      const start = convertToTimezone(startDate, timezone);
      if (isBefore(start, new Date())) {
        errors.push('Start date cannot be in the past.');
      }
    } catch (error) {
      errors.push('Error validating start date.');
    }
  }

  // Check if end date is in the future
  if (endDate) {
    try {
      const end = convertToTimezone(endDate, timezone);
      if (isBefore(end, new Date())) {
        errors.push('End date cannot be in the past.');
      }
    } catch (error) {
      errors.push('Error validating end date.');
    }
  }

  return {
    isValid: errors.length === 0,
    errors,
  };
}

/**
 * Get pricing status (not started, active, expired)
 */
export type PricingStatus = 'not_started' | 'active' | 'expired';

export function getPricingStatus(
  startDate: string | Date | null,
  endDate: string | Date | null,
  timezone: string = 'UTC'
): PricingStatus {
  const now = new Date();

  try {
    if (startDate) {
      const start = convertToTimezone(startDate, timezone);
      if (isAfter(now, start) === false && isEqual(now, start) === false) {
        return 'not_started';
      }
    }

    if (endDate) {
      const end = convertToTimezone(endDate, timezone);
      if (isBefore(now, end) === false && isEqual(now, end) === false) {
        return 'expired';
      }
    }

    return 'active';
  } catch (error) {
    console.error('Error getting pricing status:', error);
    return 'active'; // Default to active on error
  }
}
