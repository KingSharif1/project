import React, { useState, useEffect, useRef } from 'react';
import { Search, Phone } from 'lucide-react';
import { Trip } from '../types';

interface RiderAutocompleteProps {
    trips: Trip[];
    onSelect: (rider: {
        firstName: string;
        lastName: string;
        customerName: string;
        customerPhone: string;
        customerEmail?: string;
        pickupLocation?: string;
        dropoffLocation?: string;
        serviceLevel?: string;
    }) => void;
    className?: string;
}

interface RiderOption {
    id: string; // Phone number as unique ID
    firstName: string;
    lastName: string;
    fullName: string;
    phone: string;
    email?: string;
    lastTrip: Trip;
}

export const RiderAutocomplete: React.FC<RiderAutocompleteProps> = ({ trips, onSelect, className = '' }) => {
    const [query, setQuery] = useState('');
    const [isOpen, setIsOpen] = useState(false);
    const [options, setOptions] = useState<RiderOption[]>([]);
    const containerRef = useRef<HTMLDivElement>(null);

    // Extract unique riders from trips history
    useEffect(() => {
        if (!query) {
            setOptions([]);
            return;
        }

        const uniqueRiders = new Map<string, RiderOption>();
        const lowerQuery = query.toLowerCase();

        // Process trips to find matches
        // We prioritize recent trips for the data source
        const sortedTrips = [...trips].sort((a, b) =>
            new Date(b.createdAt || '').getTime() - new Date(a.createdAt || '').getTime()
        );

        sortedTrips.forEach(trip => {
            const phone = trip.customerPhone;
            if (!phone) return;

            // Skip if we already have this rider (using phone as key)
            if (uniqueRiders.has(phone)) return;

            const firstName = trip.firstName || '';
            const lastName = trip.lastName || '';
            const fullName = trip.customerName || `${firstName} ${lastName}`.trim();

            // Check for match
            if (
                fullName.toLowerCase().includes(lowerQuery) ||
                phone.includes(query)
            ) {
                uniqueRiders.set(phone, {
                    id: phone,
                    firstName,
                    lastName,
                    fullName,
                    phone,
                    email: trip.customerEmail,
                    lastTrip: trip,
                });
            }
        });

        setOptions(Array.from(uniqueRiders.values()).slice(0, 10)); // Limit to 10 results
    }, [query, trips]);

    // Click outside to close
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
                setIsOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const handleSelect = (rider: RiderOption) => {
        onSelect({
            firstName: rider.firstName,
            lastName: rider.lastName,
            customerName: rider.fullName,
            customerPhone: rider.phone,
            customerEmail: rider.email,
            pickupLocation: rider.lastTrip.pickupLocation,
            dropoffLocation: rider.lastTrip.dropoffLocation,
            serviceLevel: rider.lastTrip.serviceLevel,
        });
        setQuery('');
        setIsOpen(false);
    };

    return (
        <div ref={containerRef} className={`relative ${className}`}>
            <label className="block text-sm font-semibold text-gray-700 mb-2">
                Find Existing Rider
            </label>
            <div className="relative">
                <input
                    type="text"
                    value={query}
                    onChange={(e) => {
                        setQuery(e.target.value);
                        setIsOpen(true);
                    }}
                    onFocus={() => setIsOpen(true)}
                    placeholder="Search by name or phone..."
                    className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white"
                />
                <Search className="absolute left-3 top-2.5 text-gray-400 w-5 h-5" />
            </div>

            {isOpen && options.length > 0 && (
                <div className="absolute z-50 w-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg max-h-60 overflow-y-auto">
                    {options.map((rider) => (
                        <button
                            key={rider.id}
                            onClick={() => handleSelect(rider)}
                            className="w-full text-left px-4 py-3 hover:bg-gray-50 border-b border-gray-100 last:border-0 flex justify-between items-center group"
                        >
                            <div>
                                <p className="font-semibold text-gray-900 group-hover:text-blue-600 transition-colors">
                                    {rider.fullName || 'Unknown Name'}
                                </p>
                                <div className="flex items-center text-xs text-gray-500 mt-1">
                                    <Phone className="w-3 h-3 mr-1" />
                                    {rider.phone}
                                </div>
                            </div>
                            <div className="text-xs text-gray-400">
                                via {rider.lastTrip.pickupLocation.split(',')[0]}
                            </div>
                        </button>
                    ))}
                </div>
            )}

            {isOpen && query && options.length === 0 && (
                <div className="absolute z-50 w-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg p-3 text-sm text-gray-500 text-center">
                    No riders found.
                </div>
            )}
        </div>
    );
};
