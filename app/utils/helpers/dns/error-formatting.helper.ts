/**
 * Formats a DNS conflict error message into a user-friendly explanation
 *
 * Handles errors like:
 * - "RRset datum.net.test-import.com. IN CNAME: Conflicts with pre-existing RRset"
 * - "Record "datum.net": status 422: {"error": "RRset datum.net.test-import.com. IN CNAME: Conflicts with pre-existing RRset"}"
 * - Any error containing "Conflicts with pre-existing RRset"
 *
 * @param errorMessage - The raw error message from the API
 * @returns A user-friendly error message, or the original message if it's not a conflict error
 */
export function formatDnsConflictError(errorMessage: string): string {
  if (!errorMessage) {
    return errorMessage;
  }

  // Extract the actual error message if it's wrapped in JSON format
  // Pattern: "Record "...": status 422: {"error": "actual error message"}"
  let actualErrorMessage = errorMessage;
  const jsonMatch = errorMessage.match(/\{[^}]*"error"\s*:\s*"([^"]+)"/);
  if (jsonMatch && jsonMatch[1]) {
    actualErrorMessage = jsonMatch[1];
  }

  // Check if this is a conflict error
  const isConflictError =
    actualErrorMessage.toLowerCase().includes('conflicts with pre-existing rrset') ||
    actualErrorMessage.toLowerCase().includes('conflicts with') ||
    actualErrorMessage.toLowerCase().includes('conflict');

  if (!isConflictError) {
    return errorMessage;
  }

  // Try to extract record type from the error message
  // Pattern: "RRset <name> IN <TYPE>: Conflicts..."
  const typeMatch = actualErrorMessage.match(/\bIN\s+([A-Z]+):?\s*Conflicts/i);
  const recordType = typeMatch ? typeMatch[1] : 'record';

  // Special handling for CNAME conflicts (most common case)
  if (recordType === 'CNAME') {
    return 'CNAME records cannot coexist with other record types at the same name. Please remove the existing records before adding this CNAME, or use a different name.';
  }

  // Generic conflict message for other record types
  return `${recordType} record conflicts with an existing record at this name. Please remove the conflicting record first, or use a different name.`;
}

/**
 * Formats any DNS error message, applying appropriate transformations
 *
 * @param errorMessage - The raw error message from the API
 * @returns A formatted, user-friendly error message
 */
export function formatDnsError(errorMessage: string): string {
  if (!errorMessage) {
    return errorMessage;
  }

  // Apply conflict formatting first
  const conflictFormatted = formatDnsConflictError(errorMessage);
  if (conflictFormatted !== errorMessage) {
    return conflictFormatted;
  }

  // Add other error formatting here as needed
  return errorMessage;
}
