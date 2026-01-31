import React, { useEffect, useRef, useState } from 'react';
import { MapPin, X } from 'lucide-react';
import { loadGoogleMaps } from '../utils/googleMapsLoader';

interface AddressAutocompleteProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  label?: string;
  required?: boolean;
  disabled?: boolean;
  icon?: React.ReactNode;
  onPlaceSelected?: (place: google.maps.places.PlaceResult) => void;
}

export const AddressAutocomplete: React.FC<AddressAutocompleteProps> = ({
  value,
  onChange,
  placeholder = 'Enter address',
  label,
  required = false,
  disabled = false,
  icon,
  onPlaceSelected,
}) => {
  const inputRef = useRef<HTMLInputElement>(null);
  const autocompleteRef = useRef<google.maps.places.Autocomplete | null>(null);
  const [isLoaded, setIsLoaded] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [inputValue, setInputValue] = useState(value);
  const ignoreNextChange = useRef(false);
  const lastPropValue = useRef(value);
  const onChangeRef = useRef(onChange);
  const onPlaceSelectedRef = useRef(onPlaceSelected);

  // Keep refs up to date
  useEffect(() => {
    onChangeRef.current = onChange;
    onPlaceSelectedRef.current = onPlaceSelected;
  }, [onChange, onPlaceSelected]);

  useEffect(() => {
    const initAutocomplete = async () => {
      try {
        await loadGoogleMaps();
        setIsLoaded(true);

        if (inputRef.current && !autocompleteRef.current) {
          const autocomplete = new google.maps.places.Autocomplete(inputRef.current, {
            componentRestrictions: { country: 'us' },
            fields: ['address_components', 'formatted_address', 'geometry', 'place_id'],
            types: ['address'],
          });

          autocomplete.addListener('place_changed', () => {
            const place = autocomplete.getPlace();
            if (place.formatted_address) {
              // Set flag to prevent the next value change from overwriting
              ignoreNextChange.current = true;

              // Update local state first
              setInputValue(place.formatted_address);

              // Then notify parent using ref to get latest callback
              onChangeRef.current(place.formatted_address);

              // Callback for additional place data
              if (onPlaceSelectedRef.current) {
                onPlaceSelectedRef.current(place);
              }

              // Keep the input value after blur
              setTimeout(() => {
                if (inputRef.current && inputRef.current.value !== place.formatted_address) {
                  inputRef.current.value = place.formatted_address;
                }
              }, 100);
            }
          });

          autocompleteRef.current = autocomplete;
        }
      } catch (err) {
        console.error('Error loading Google Maps:', err);
        setError('Failed to load address autocomplete');
      }
    };

    initAutocomplete();

    return () => {
      if (autocompleteRef.current && window.google?.maps) {
        google.maps.event.clearInstanceListeners(autocompleteRef.current);
      }
    };
  }, []); // Empty dependency array - only init once

  useEffect(() => {
    // Only update inputValue from prop if:
    // 1. We're not ignoring changes (just selected from autocomplete)
    // 2. The value has actually changed from what we last saw
    // 3. THIS input is not currently focused (user is not typing in THIS field)
    if (!ignoreNextChange.current && value !== lastPropValue.current) {
      const isFocused = document.activeElement === inputRef.current;

      // IMPORTANT: Don't clear a filled input with an empty value from parent
      // BUT: Don't push value back to parent as this interferes with other fields
      if (inputValue && !value) {
        // Keep the current value, update reference only
        lastPropValue.current = inputValue;
        // Don't call onChange here - let the field keep its value without notifying parent
        return;
      }

      // Only sync if THIS input is not focused AND we have a meaningful value
      if (!isFocused && value) {
        setInputValue(value);
        lastPropValue.current = value;
        // Also update the actual input field
        if (inputRef.current) {
          inputRef.current.value = value;
        }
      } else if (value) {
        // If focused but value is meaningful, still update our reference
        lastPropValue.current = value;
      }
    }
    // Reset the ignore flag
    if (ignoreNextChange.current) {
      ignoreNextChange.current = false;
    }
  }, [value, inputValue, onChange]);

  const handleClear = () => {
    setInputValue('');
    onChangeRef.current('');
    if (inputRef.current) {
      inputRef.current.focus();
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value;
    setInputValue(newValue);
    onChangeRef.current(newValue);
  };

  if (error) {
    return (
      <div>
        {label && (
          <label className="block text-sm font-semibold text-gray-700 mb-2">
            {label}
            {required && <span className="text-red-500 ml-1">*</span>}
          </label>
        )}
        <div className="relative">
          {icon && (
            <div className="absolute left-3 top-3 text-gray-400">
              {icon}
            </div>
          )}
          <input
            ref={inputRef}
            type="text"
            value={inputValue}
            onChange={handleInputChange}
            placeholder={placeholder}
            required={required}
            disabled={disabled}
            className={`w-full ${icon ? 'pl-11' : 'pl-4'} pr-10 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:bg-gray-100 disabled:cursor-not-allowed`}
          />
          {value && !disabled && (
            <button
              type="button"
              onClick={handleClear}
              className="absolute right-3 top-3 text-gray-400 hover:text-gray-600 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          )}
        </div>
        <p className="text-xs text-amber-600 mt-1">Address autocomplete unavailable (using manual input)</p>
      </div>
    );
  }

  return (
    <div>
      {label && (
        <label className="block text-sm font-semibold text-gray-700 mb-2">
          {label}
          {required && <span className="text-red-500 ml-1">*</span>}
        </label>
      )}
      <div className="relative group">
        {icon && (
          <div className="absolute left-3 top-3 text-gray-400 group-focus-within:text-blue-500 transition-colors">
            {icon}
          </div>
        )}
        <input
          ref={inputRef}
          type="text"
          value={inputValue}
          onChange={handleInputChange}
          placeholder={placeholder}
          required={required}
          disabled={disabled || !isLoaded}
          className={`w-full ${icon ? 'pl-11' : 'pl-4'} pr-10 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:bg-gray-100 disabled:cursor-not-allowed transition-all duration-200`}
        />
        {value && !disabled && (
          <button
            type="button"
            onClick={handleClear}
            className="absolute right-3 top-3 text-gray-400 hover:text-gray-600 transition-colors"
            title="Clear address"
          >
            <X className="w-5 h-5" />
          </button>
        )}
        {!isLoaded && !error && (
          <div className="absolute right-3 top-3">
            <div className="w-5 h-5 border-2 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
          </div>
        )}
      </div>
      {isLoaded && (
        <p className="text-xs text-green-600 mt-1 flex items-center">
          <MapPin className="w-3 h-3 mr-1" />
          Address autocomplete enabled
        </p>
      )}
    </div>
  );
};
