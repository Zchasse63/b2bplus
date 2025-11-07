/**
 * Safe Math Utilities
 *
 * Provides safe arithmetic operations that handle NaN, Infinity, and division by zero
 * Use these utilities for all financial calculations, analytics, and user-facing numbers
 */

/**
 * Safely add multiple numbers, treating non-finite values as 0
 * @param numbers - Numbers to add
 * @returns Sum of all finite numbers, or 0 if result is not finite
 *
 * @example
 * safeAdd(10, 20, 30) // 60
 * safeAdd(10, NaN, 30) // 40
 * safeAdd(Infinity, 10) // 0
 */
export function safeAdd(...numbers: number[]): number {
  const result = numbers.reduce((sum, n) => sum + (Number.isFinite(n) ? n : 0), 0);
  return Number.isFinite(result) ? result : 0;
}

/**
 * Safely multiply multiple numbers, treating non-finite values as 1
 * @param numbers - Numbers to multiply
 * @returns Product of all finite numbers, or 0 if result is not finite
 *
 * @example
 * safeMultiply(10, 20, 30) // 6000
 * safeMultiply(10, NaN, 30) // 300
 * safeMultiply(Infinity, 10) // 0
 */
export function safeMultiply(...numbers: number[]): number {
  const result = numbers.reduce((product, n) => product * (Number.isFinite(n) ? n : 1), 1);
  return Number.isFinite(result) ? result : 0;
}

/**
 * Safely divide two numbers, handling division by zero and non-finite values
 * @param numerator - Number to divide
 * @param denominator - Number to divide by
 * @param defaultValue - Value to return if division fails (default: 0)
 * @returns Result of division, or defaultValue if invalid
 *
 * @example
 * safeDivide(100, 20) // 5
 * safeDivide(100, 0) // 0
 * safeDivide(100, 0, -1) // -1
 * safeDivide(NaN, 20) // 0
 */
export function safeDivide(numerator: number, denominator: number, defaultValue: number = 0): number {
  if (!Number.isFinite(numerator) || !Number.isFinite(denominator) || denominator === 0) {
    return defaultValue;
  }
  const result = numerator / denominator;
  return Number.isFinite(result) ? result : defaultValue;
}

/**
 * Safely subtract two numbers
 * @param a - First number
 * @param b - Second number
 * @returns Difference, or 0 if either value is not finite
 *
 * @example
 * safeSubtract(100, 30) // 70
 * safeSubtract(100, NaN) // 0
 */
export function safeSubtract(a: number, b: number): number {
  if (!Number.isFinite(a) || !Number.isFinite(b)) {
    return 0;
  }
  const result = a - b;
  return Number.isFinite(result) ? result : 0;
}

/**
 * Calculate percentage safely
 * @param value - The value to calculate percentage of
 * @param total - The total to calculate against
 * @returns Percentage (0-100), or 0 if calculation fails
 *
 * @example
 * safePercentage(25, 100) // 25
 * safePercentage(50, 200) // 25
 * safePercentage(100, 0) // 0
 */
export function safePercentage(value: number, total: number): number {
  return safeDivide(value * 100, total, 0);
}

/**
 * Calculate average of an array of numbers
 * @param numbers - Array of numbers
 * @returns Average of all finite numbers, or 0 if empty or invalid
 *
 * @example
 * safeAverage([10, 20, 30]) // 20
 * safeAverage([10, NaN, 30]) // 20
 * safeAverage([]) // 0
 */
export function safeAverage(numbers: number[]): number {
  const finiteNumbers = numbers.filter(n => Number.isFinite(n));
  if (finiteNumbers.length === 0) {
    return 0;
  }
  return safeDivide(safeAdd(...finiteNumbers), finiteNumbers.length, 0);
}

/**
 * Round a number to a specified number of decimal places
 * @param value - Number to round
 * @param decimals - Number of decimal places (default: 2)
 * @returns Rounded number, or 0 if value is not finite
 *
 * @example
 * safeRound(10.12345, 2) // 10.12
 * safeRound(10.12345, 4) // 10.1235
 * safeRound(NaN, 2) // 0
 */
export function safeRound(value: number, decimals: number = 2): number {
  if (!Number.isFinite(value)) {
    return 0;
  }
  const multiplier = Math.pow(10, decimals);
  const result = Math.round(value * multiplier) / multiplier;
  return Number.isFinite(result) ? result : 0;
}

/**
 * Format a number as currency (USD)
 * @param amount - Amount to format
 * @returns Formatted currency string, or "$0.00" if amount is not finite
 *
 * @example
 * formatCurrency(1234.56) // "$1,234.56"
 * formatCurrency(NaN) // "$0.00"
 * formatCurrency(Infinity) // "$0.00"
 */
export function formatCurrency(amount: number): string {
  if (!Number.isFinite(amount)) {
    return '$0.00';
  }
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD'
  }).format(amount);
}

/**
 * Format a number as a percentage
 * @param value - Value to format (0-100 scale)
 * @param decimals - Number of decimal places (default: 1)
 * @returns Formatted percentage string
 *
 * @example
 * formatPercentage(25.5) // "25.5%"
 * formatPercentage(NaN) // "0.0%"
 */
export function formatPercentage(value: number, decimals: number = 1): string {
  if (!Number.isFinite(value)) {
    return `0.${'0'.repeat(decimals)}%`;
  }
  return `${safeRound(value, decimals)}%`;
}

/**
 * Parse a string to a number safely
 * @param value - String to parse
 * @param defaultValue - Value to return if parsing fails (default: 0)
 * @returns Parsed number or defaultValue
 *
 * @example
 * safeParseFloat("123.45") // 123.45
 * safeParseFloat("invalid") // 0
 * safeParseFloat("invalid", -1) // -1
 */
export function safeParseFloat(value: string | number, defaultValue: number = 0): number {
  if (typeof value === 'number') {
    return Number.isFinite(value) ? value : defaultValue;
  }
  const parsed = parseFloat(value);
  return Number.isFinite(parsed) ? parsed : defaultValue;
}

/**
 * Parse a string to an integer safely
 * @param value - String to parse
 * @param defaultValue - Value to return if parsing fails (default: 0)
 * @returns Parsed integer or defaultValue
 *
 * @example
 * safeParseInt("123") // 123
 * safeParseInt("invalid") // 0
 * safeParseInt("invalid", -1) // -1
 */
export function safeParseInt(value: string | number, defaultValue: number = 0): number {
  if (typeof value === 'number') {
    return Number.isFinite(value) ? Math.floor(value) : defaultValue;
  }
  const parsed = parseInt(value, 10);
  return Number.isFinite(parsed) ? parsed : defaultValue;
}

/**
 * Calculate the sum of a specific property in an array of objects
 * @param items - Array of objects
 * @param key - Property key to sum
 * @returns Sum of all finite values
 *
 * @example
 * safeSumBy([{price: 10}, {price: 20}], 'price') // 30
 * safeSumBy([{price: 10}, {price: NaN}], 'price') // 10
 */
export function safeSumBy<T>(items: T[], key: keyof T): number {
  return items.reduce((sum, item) => {
    const value = item[key];
    const numValue = typeof value === 'number' ? value : 0;
    return safeAdd(sum, numValue);
  }, 0);
}

/**
 * Clamp a value between a minimum and maximum
 * @param value - Value to clamp
 * @param min - Minimum value
 * @param max - Maximum value
 * @returns Clamped value
 *
 * @example
 * safeClamp(5, 0, 10) // 5
 * safeClamp(-5, 0, 10) // 0
 * safeClamp(15, 0, 10) // 10
 */
export function safeClamp(value: number, min: number, max: number): number {
  if (!Number.isFinite(value)) {
    return min;
  }
  return Math.max(min, Math.min(max, value));
}
