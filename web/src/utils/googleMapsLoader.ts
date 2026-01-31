const GOOGLE_MAPS_API_KEY = import.meta.env.VITE_GOOGLE_MAPS_API_KEY;

let loaderPromise: Promise<typeof google> | null = null;
let isLoaded = false;

export async function loadGoogleMaps(): Promise<typeof google> {
  if (isLoaded && window.google?.maps) {
    return window.google;
  }

  if (!loaderPromise) {
    if (!GOOGLE_MAPS_API_KEY) {
      throw new Error('Google Maps API key not configured');
    }

    loaderPromise = new Promise((resolve, reject) => {
      if (window.google?.maps) {
        isLoaded = true;
        resolve(window.google);
        return;
      }

      const script = document.createElement('script');
      script.src = `https://maps.googleapis.com/maps/api/js?key=${GOOGLE_MAPS_API_KEY}&libraries=places,geometry&callback=initGoogleMaps`;
      script.async = true;
      script.defer = true;

      (window as any).initGoogleMaps = () => {
        isLoaded = true;
        delete (window as any).initGoogleMaps;
        resolve(window.google);
      };

      script.onerror = () => {
        reject(new Error('Failed to load Google Maps'));
      };

      document.head.appendChild(script);
    });
  }

  return loaderPromise;
}

export function isGoogleMapsLoaded(): boolean {
  return isLoaded && !!window.google?.maps;
}
