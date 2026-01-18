/**
 * Utility functions for error handling
 */

/**
 * Safely extracts error message from API error responses
 * Handles both string and object error formats
 */
export function getErrorMessage(error: any, defaultMessage: string = 'An error occurred'): string {
    if (!error) return defaultMessage

    // Check if error has response data
    if (error.response?.data?.error) {
        const errorData = error.response.data.error

        // Handle both string and object error formats
        if (typeof errorData === 'string') {
            return errorData
        }

        // If it's an object, try to extract message property
        if (typeof errorData === 'object' && errorData.message) {
            return errorData.message
        }
    }

    // Fallback to error message if available
    if (error.message) {
        return error.message
    }

    return defaultMessage
}
