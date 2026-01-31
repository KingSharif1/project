export interface ParsedAddress {
  street: string;
  city: string;
  state: string;
  zip: string;
}

export function parseAddress(fullAddress: string): ParsedAddress {
  if (!fullAddress || fullAddress.trim() === '') {
    return {
      street: '',
      city: 'Fort Worth',
      state: 'TX',
      zip: '76036',
    };
  }

  const parts = fullAddress.split(',').map(s => s.trim());

  // Handle different Google Maps address formats
  // Format 1: "Street, City, State ZIP, Country"
  // Format 2: "Street, City, State ZIP"
  // Format 3: "Street, City State ZIP"

  if (parts.length >= 3) {
    // Try to find the part with state and ZIP
    let stateZipPart = '';
    let cityPart = '';
    let street = '';

    // Check last part for country (USA)
    const lastPart = parts[parts.length - 1];
    const hasCountry = lastPart.toLowerCase().includes('usa') || lastPart.toLowerCase().includes('united states');

    if (hasCountry && parts.length >= 4) {
      // Format: "Street, City, State ZIP, Country"
      stateZipPart = parts[parts.length - 2];
      cityPart = parts[parts.length - 3];
      street = parts.slice(0, -3).join(', ');
    } else {
      // Format: "Street, City, State ZIP"
      stateZipPart = parts[parts.length - 1];
      cityPart = parts[parts.length - 2];
      street = parts.slice(0, -2).join(', ');
    }

    // Extract state and ZIP from the state/ZIP part
    const stateZipMatch = stateZipPart.match(/([A-Z]{2})\s+(\d{5}(-\d{4})?)/);

    if (stateZipMatch && cityPart) {
      return {
        street: street || fullAddress,
        city: cityPart,
        state: stateZipMatch[1],
        zip: stateZipMatch[2].split('-')[0], // Get just the 5-digit ZIP
      };
    }
  }

  // If parsing fails, return the full address as street with defaults
  return {
    street: fullAddress,
    city: 'Fort Worth',
    state: 'TX',
    zip: '76036',
  };
}
