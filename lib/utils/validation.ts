/**
 * Validation utilities for URL parameters and data
 */

/**
 * Validates if a string is a valid UUID v4 format
 * @param id - The string to validate
 * @returns true if valid UUID v4, false otherwise
 */
export const isValidCampaignId = (id: string): boolean => {
  // UUID v4 format validation
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
  return uuidRegex.test(id)
}

/**
 * Validates if a value is a valid email ID
 * @param id - The value to validate (string or number)
 * @returns true if valid email ID (1-365), false otherwise
 */
export const isValidEmailId = (id: string | number): boolean => {
  const num = typeof id === 'string' ? parseInt(id, 10) : id
  return !Number.isNaN(num) && num > 0 && num <= 365 // Reasonable email count limit
}

/**
 * Validates if a string is a valid URL
 * @param url - The string to validate
 * @returns true if valid URL, false otherwise
 */
export const isValidUrl = (url: string): boolean => {
  try {
    new URL(url)
    return true
  } catch {
    return false
  }
}

/**
 * Validates if a string is not empty and has reasonable length
 * @param str - The string to validate
 * @param maxLength - Maximum allowed length (default: 1000)
 * @returns true if valid string, false otherwise
 */
export const isValidString = (str: string, maxLength: number = 1000): boolean => {
  return typeof str === 'string' && str.trim().length > 0 && str.length <= maxLength
}
