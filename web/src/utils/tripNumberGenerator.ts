/**
 * Generates a trip number in the format FW####A or FW####B
 * @param isReturnTrip - Whether this is the return leg of a roundtrip
 * @param existingNumber - Existing trip number to append suffix to
 * @param existingTripNumbers - Array of existing trip numbers to avoid duplicates
 * @returns Trip number in format FW####A or FW####B
 */
export const generateTripNumber = (
  isReturnTrip: boolean = false,
  existingNumber?: string,
  existingTripNumbers: string[] = []
): string => {
  if (existingNumber) {
    // If we have an existing number, just change/add the suffix
    const baseNumber = existingNumber.replace(/[AB]$/, '');
    return `${baseNumber}${isReturnTrip ? 'B' : 'A'}`;
  }

  // Generate new base number: FW followed by 4 digits
  // Keep trying until we find a unique number
  let attempts = 0;
  const maxAttempts = 100;

  while (attempts < maxAttempts) {
    const randomDigits = Math.floor(1000 + Math.random() * 9000);
    const baseNumber = `FW${randomDigits}`;
    const tripNumber = `${baseNumber}${isReturnTrip ? 'B' : 'A'}`;

    // Check if this number already exists
    if (!existingTripNumbers.includes(tripNumber)) {
      return tripNumber;
    }

    attempts++;
  }

  // Fallback: use timestamp to ensure uniqueness
  const timestamp = Date.now().toString().slice(-4);
  const baseNumber = `FW${timestamp}`;
  return `${baseNumber}${isReturnTrip ? 'B' : 'A'}`;
};

/**
 * Extracts the base trip number without the A/B suffix
 * @param tripNumber - Full trip number (e.g., FW1234A)
 * @returns Base number without suffix (e.g., FW1234)
 */
export const getBaseTripNumber = (tripNumber: string): string => {
  return tripNumber.replace(/[AB]$/, '');
};

/**
 * Checks if a trip number is for a return trip (ends with B)
 * @param tripNumber - Trip number to check
 * @returns true if return trip (ends with B)
 */
export const isReturnTripNumber = (tripNumber: string): boolean => {
  return tripNumber.endsWith('B');
};

/**
 * Gets the paired trip number (A<->B)
 * @param tripNumber - Current trip number
 * @returns The paired trip number (FW1234A -> FW1234B or vice versa)
 */
export const getPairedTripNumber = (tripNumber: string): string => {
  const baseNumber = getBaseTripNumber(tripNumber);
  const isReturn = isReturnTripNumber(tripNumber);
  return `${baseNumber}${isReturn ? 'A' : 'B'}`;
};
