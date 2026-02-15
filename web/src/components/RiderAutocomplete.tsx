import React, { useState, useEffect, useRef } from 'react';
import { Search, Phone, User } from 'lucide-react';
import { Trip } from '../types';
import { searchPatients } from '../services/api';

interface RiderAutocompleteProps {
    trips: Trip[];
    onSelect: (rider: {
        id?: string;
        firstName: string;
        lastName: string;
        customerName: string;
        customerPhone: string;
        customerEmail?: string;
        pickupLocation?: string;
        dropoffLocation?: string;
        serviceLevel?: string;
        notes?: string;
    }) => void;
    className?: string;
}

interface RiderOption {
    id: string;
    firstName: string;
    lastName: string;
    fullName: string;
    phone: string;
    accountNumber?: string;
    serviceLevel?: string;
    notes?: string;
}

export const RiderAutocomplete: React.FC<RiderAutocompleteProps> = ({ trips, onSelect, className = '' }) => {
    const [query, setQuery] = useState('');
    const [isOpen, setIsOpen] = useState(false);
    const [options, setOptions] = useState<RiderOption[]>([]);
    const [isSearching, setIsSearching] = useState(false);
    const containerRef = useRef<HTMLDivElement>(null);

    // Search patients table via API
    useEffect(() => {
        if (!query || query.length < 2) {
            setOptions([]);
            return;
        }

        const searchTimer = setTimeout(async () => {
            setIsSearching(true);
            try {
                const result = await searchPatients(query);
                if (result.success && result.data) {
                    const riders: RiderOption[] = result.data.map((p: any) => ({
                        id: p.id,
                        firstName: p.first_name || '',
                        lastName: p.last_name || '',
                        fullName: `${p.first_name || ''} ${p.last_name || ''}`.trim(),
                        phone: p.phone || '',
                        accountNumber: p.account_number || '',
                        serviceLevel: p.service_level || 'ambulatory',
                        notes: p.notes || '',
                    }));
                    setOptions(riders);
                }
            } catch (error) {
                console.error('Error searching patients:', error);
            } finally {
                setIsSearching(false);
            }
        }, 300);

        return () => clearTimeout(searchTimer);
    }, [query]);

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
        // Find last trip for this rider to get pickup/dropoff defaults
        const lastTrip = trips.find(t =>
            t.customerPhone === rider.phone ||
            t.patientId === rider.id
        );

        onSelect({
            id: rider.id,
            firstName: rider.firstName,
            lastName: rider.lastName,
            customerName: rider.fullName,
            customerPhone: rider.phone,
            pickupLocation: lastTrip?.pickupLocation || '',
            dropoffLocation: lastTrip?.dropoffLocation || '',
            serviceLevel: rider.serviceLevel,
            notes: rider.notes,
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
                    onFocus={() => query.length >= 2 && setIsOpen(true)}
                    placeholder="Search by name, phone, or account #..."
                    className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white"
                />
                <Search className="absolute left-3 top-2.5 text-gray-400 w-5 h-5" />
            </div>

            {isOpen && isSearching && (
                <div className="absolute z-50 w-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg p-3 text-sm text-gray-500 text-center">
                    Searching...
                </div>
            )}

            {isOpen && !isSearching && options.length > 0 && (
                <div className="absolute z-50 w-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg max-h-60 overflow-y-auto">
                    {options.map((rider) => (
                        <button
                            key={rider.id}
                            onClick={() => handleSelect(rider)}
                            className="w-full text-left px-4 py-3 hover:bg-blue-50 border-b border-gray-100 last:border-0 group"
                        >
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-3">
                                    <div className="w-8 h-8 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center">
                                        <User className="w-4 h-4" />
                                    </div>
                                    <div>
                                        <p className="font-semibold text-gray-900 group-hover:text-blue-600 transition-colors">
                                            {rider.fullName || 'Unknown Name'}
                                        </p>
                                        <div className="flex items-center gap-3 text-xs text-gray-500 mt-0.5">
                                            <span className="flex items-center">
                                                <Phone className="w-3 h-3 mr-1" />
                                                {rider.phone}
                                            </span>
                                            {rider.accountNumber && (
                                                <span className="text-gray-400">Acct: {rider.accountNumber}</span>
                                            )}
                                        </div>
                                    </div>
                                </div>
                                <span className="text-xs capitalize px-2 py-0.5 rounded-full bg-gray-100 text-gray-600">
                                    {rider.serviceLevel}
                                </span>
                            </div>
                        </button>
                    ))}
                </div>
            )}

            {isOpen && !isSearching && query.length >= 2 && options.length === 0 && (
                <div className="absolute z-50 w-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg p-3 text-sm text-gray-500 text-center">
                    No riders found. Switch to "New Rider" to create one.
                </div>
            )}
        </div>
    );
};
