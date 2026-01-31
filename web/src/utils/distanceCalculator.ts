// src/utils/distanceCalculator.ts
import { loadGoogleMaps } from './googleMapsLoader';

interface DistanceResult {
  success: boolean;
  distanceMiles: number;
  error?: string;
}

// Haversine formula to calculate distance between two coordinates
export function calculateDistanceFromCoords(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const R = 3958.8; // Radius of Earth in miles
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;

  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) ** 2;

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return R * c; // distance in miles
}

// Geocode an address to get coordinates
async function geocodeAddress(address: string): Promise<{lat: number; lng: number} | null> {
  try {
    await loadGoogleMaps();

    const geocoder = new google.maps.Geocoder();
    const result = await geocoder.geocode({ address });

    if (result.results && result.results.length > 0) {
      const location = result.results[0].geometry.location;
      return {
        lat: location.lat(),
        lng: location.lng()
      };
    }

    return null;
  } catch (error) {
    console.error('Geocoding error:', error);
    return null;
  }
}

// Calculate distance between two addresses using Google Maps Distance Matrix API
export async function calculateDistance(
  fromAddress: string,
  toAddress: string
): Promise<DistanceResult> {
  try {
    await loadGoogleMaps();

    const service = new google.maps.DistanceMatrixService();

    const response = await service.getDistanceMatrix({
      origins: [fromAddress],
      destinations: [toAddress],
      travelMode: google.maps.TravelMode.DRIVING,
      unitSystem: google.maps.UnitSystem.IMPERIAL,
    });

    if (response.rows && response.rows.length > 0) {
      const element = response.rows[0].elements[0];

      if (element.status === 'OK' && element.distance) {
        // Distance is returned in meters, convert to miles
        const distanceInMeters = element.distance.value;
        const distanceInMiles = distanceInMeters * 0.000621371; // meters to miles

        return {
          success: true,
          distanceMiles: parseFloat(distanceInMiles.toFixed(2))
        };
      } else {
        // Fallback to Haversine formula if Distance Matrix fails
        const fromCoords = await geocodeAddress(fromAddress);
        const toCoords = await geocodeAddress(toAddress);

        if (!fromCoords || !toCoords) {
          return {
            success: false,
            distanceMiles: 0,
            error: 'Failed to calculate distance between addresses'
          };
        }

        const distance = calculateDistanceFromCoords(
          fromCoords.lat,
          fromCoords.lng,
          toCoords.lat,
          toCoords.lng
        );

        return {
          success: true,
          distanceMiles: parseFloat(distance.toFixed(2))
        };
      }
    }

    return {
      success: false,
      distanceMiles: 0,
      error: 'No route found between addresses'
    };
  } catch (error) {
    console.error('Distance calculation error:', error);
    return {
      success: false,
      distanceMiles: 0,
      error: error instanceof Error ? error.message : 'Unknown error occurred'
    };
  }
}
