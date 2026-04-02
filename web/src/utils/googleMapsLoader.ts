const GOOGLE_MAPS_API_KEY = 'AIzaSyC_ndqJSoBhp5bdmlz6TaHZ7Jzigo5cx6I';
const LOAD_TIMEOUT = 10000; // 10 seconds
const MAX_RETRIES = 3;

let loaderPromise: Promise<typeof google> | null = null;
let isLoaded = false;
let retryCount = 0;

export async function loadGoogleMaps(): Promise<typeof google> {
  // Already loaded and available
  if (isLoaded && window.google?.maps) {
    return window.google;
  }

  // Loading in progress
  if (loaderPromise) {
    return loaderPromise;
  }

  loaderPromise = loadWithRetry();
  return loaderPromise;
}

async function loadWithRetry(): Promise<typeof google> {
  while (retryCount < MAX_RETRIES) {
    try {
      return await loadScript();
    } catch (error) {
      retryCount++;
      console.warn(`Google Maps load attempt ${retryCount} failed:`, error);
      
      if (retryCount >= MAX_RETRIES) {
        loaderPromise = null;
        retryCount = 0;
        throw new Error(`Failed to load Google Maps after ${MAX_RETRIES} attempts`);
      }
      
      // Wait before retry (exponential backoff)
      await new Promise(resolve => setTimeout(resolve, 1000 * retryCount));
      
      // Remove failed script
      const existingScript = document.querySelector('script[src*="maps.googleapis.com"]');
      if (existingScript) {
        existingScript.remove();
      }
    }
  }
  
  throw new Error('Failed to load Google Maps');
}

function loadScript(): Promise<typeof google> {
  return new Promise((resolve, reject) => {
    // Check if already loaded
    if (window.google?.maps) {
      isLoaded = true;
      retryCount = 0;
      resolve(window.google);
      return;
    }

    // Check if script already exists and is loading
    const existingScript = document.querySelector('script[src*="maps.googleapis.com"]');
    if (existingScript) {
      // Wait for existing script to load
      const checkInterval = setInterval(() => {
        if (window.google?.maps) {
          isLoaded = true;
          retryCount = 0;
          clearInterval(checkInterval);
          resolve(window.google);
        }
      }, 100);

      // Timeout for existing script
      setTimeout(() => {
        clearInterval(checkInterval);
        if (!window.google?.maps) {
          reject(new Error('Timeout waiting for existing Google Maps script'));
        }
      }, LOAD_TIMEOUT);
      return;
    }

    // Create new script with direct loading (no callback)
    const script = document.createElement('script');
    script.src = `https://maps.googleapis.com/maps/api/js?key=${GOOGLE_MAPS_API_KEY}&libraries=places,geometry&loading=async`;
    script.async = true;
    script.defer = true;

    // Timeout handler
    const timeoutId = setTimeout(() => {
      script.remove();
      reject(new Error('Google Maps API load timeout'));
    }, LOAD_TIMEOUT);

    // Success handler
    script.onload = () => {
      clearTimeout(timeoutId);
      
      // Poll for google.maps availability (script loads before API is ready)
      const checkReady = setInterval(() => {
        if (window.google?.maps) {
          clearInterval(checkReady);
          isLoaded = true;
          retryCount = 0;
          resolve(window.google);
        }
      }, 50);

      // Safety timeout
      setTimeout(() => {
        clearInterval(checkReady);
        if (!window.google?.maps) {
          reject(new Error('Google Maps API loaded but not ready'));
        }
      }, 5000);
    };

    // Error handler
    script.onerror = () => {
      clearTimeout(timeoutId);
      script.remove();
      reject(new Error('Failed to load Google Maps script'));
    };

    document.head.appendChild(script);
  });
}

export function isGoogleMapsLoaded(): boolean {
  return isLoaded && !!window.google?.maps;
}
