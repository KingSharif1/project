import React, { useState } from 'react';
import { TrendingUp, Clock, Star, DollarSign, Award, MapPin, AlertCircle } from 'lucide-react';
import { Driver } from '../types';

interface DriverPerformanceProps {
  driver: Driver;
  onClose: () => void;
}

export const DriverPerformance: React.FC<DriverPerformanceProps> = ({ driver, onClose }) => {
  const [timeRange, setTimeRange] = useState<'week' | 'month' | 'year'>('month');

  // Mock performance data - in production, fetch from database
  const performanceData = {
    totalTrips: driver.totalTrips,
    completedTrips: Math.floor(driver.totalTrips * 0.95),
    canceledTrips: Math.floor(driver.totalTrips * 0.02),
    noShowTrips: Math.floor(driver.totalTrips * 0.03),
    totalRevenue: driver.totalTrips * 45.50,
    avgTripDuration: 32,
    onTimePercentage: 94,
    rating: driver.rating,
    totalRatings: 127,
    responseTime: 2.3,
    acceptance: 96,
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 bg-gradient-to-r from-blue-600 to-cyan-600 text-white p-6 rounded-t-2xl">
          <div className="flex items-start justify-between">
            <div>
              <h2 className="text-2xl font-bold mb-2">{driver.name}</h2>
              <p className="text-blue-100">Performance Analytics</p>
            </div>
            <button
              onClick={onClose}
              className="text-white hover:bg-white hover:bg-opacity-20 rounded-full p-2 transition-colors"
            >
              <span className="text-2xl">×</span>
            </button>
          </div>

          {/* Time Range Selector */}
          <div className="flex items-center space-x-2 mt-4">
            {(['week', 'month', 'year'] as const).map((range) => (
              <button
                key={range}
                onClick={() => setTimeRange(range)}
                className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                  timeRange === range
                    ? 'bg-white text-blue-600'
                    : 'bg-white bg-opacity-20 text-white hover:bg-opacity-30'
                }`}
              >
                {range.charAt(0).toUpperCase() + range.slice(1)}
              </button>
            ))}
          </div>
        </div>

        <div className="p-6 space-y-6">
          {/* Key Metrics */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-xl p-4 border border-blue-200">
              <div className="flex items-center space-x-2 mb-2">
                <TrendingUp className="w-5 h-5 text-blue-600" />
                <span className="text-sm text-blue-800 font-medium">Total Trips</span>
              </div>
              <div className="text-3xl font-bold text-blue-900">{performanceData.totalTrips}</div>
            </div>

            <div className="bg-gradient-to-br from-green-50 to-green-100 rounded-xl p-4 border border-green-200">
              <div className="flex items-center space-x-2 mb-2">
                <DollarSign className="w-5 h-5 text-green-600" />
                <span className="text-sm text-green-800 font-medium">Revenue</span>
              </div>
              <div className="text-3xl font-bold text-green-900">
                ${performanceData.totalRevenue.toLocaleString()}
              </div>
            </div>

            <div className="bg-gradient-to-br from-amber-50 to-amber-100 rounded-xl p-4 border border-amber-200">
              <div className="flex items-center space-x-2 mb-2">
                <Star className="w-5 h-5 text-amber-600" />
                <span className="text-sm text-amber-800 font-medium">Rating</span>
              </div>
              <div className="text-3xl font-bold text-amber-900">
                {performanceData.rating.toFixed(1)}
              </div>
              <div className="text-xs text-amber-700 mt-1">
                {performanceData.totalRatings} ratings
              </div>
            </div>

            <div className="bg-gradient-to-br from-purple-50 to-purple-100 rounded-xl p-4 border border-purple-200">
              <div className="flex items-center space-x-2 mb-2">
                <Clock className="w-5 h-5 text-purple-600" />
                <span className="text-sm text-purple-800 font-medium">Avg Time</span>
              </div>
              <div className="text-3xl font-bold text-purple-900">
                {performanceData.avgTripDuration}m
              </div>
            </div>
          </div>

          {/* Trip Breakdown */}
          <div className="bg-white rounded-xl border border-gray-200 p-6">
            <h3 className="text-lg font-bold text-gray-900 mb-4">Trip Breakdown</h3>
            <div className="space-y-3">
              <div className="flex items-center justify-between p-3 bg-green-50 rounded-lg">
                <div className="flex items-center space-x-3">
                  <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                  <span className="font-medium text-gray-900">Completed</span>
                </div>
                <div className="flex items-center space-x-3">
                  <span className="text-2xl font-bold text-green-700">
                    {performanceData.completedTrips}
                  </span>
                  <span className="text-sm text-green-600">
                    {((performanceData.completedTrips / performanceData.totalTrips) * 100).toFixed(1)}%
                  </span>
                </div>
              </div>

              <div className="flex items-center justify-between p-3 bg-red-50 rounded-lg">
                <div className="flex items-center space-x-3">
                  <div className="w-3 h-3 bg-red-500 rounded-full"></div>
                  <span className="font-medium text-gray-900">Canceled</span>
                </div>
                <div className="flex items-center space-x-3">
                  <span className="text-2xl font-bold text-red-700">
                    {performanceData.canceledTrips}
                  </span>
                  <span className="text-sm text-red-600">
                    {((performanceData.canceledTrips / performanceData.totalTrips) * 100).toFixed(1)}%
                  </span>
                </div>
              </div>

              <div className="flex items-center justify-between p-3 bg-amber-50 rounded-lg">
                <div className="flex items-center space-x-3">
                  <div className="w-3 h-3 bg-amber-500 rounded-full"></div>
                  <span className="font-medium text-gray-900">No Show</span>
                </div>
                <div className="flex items-center space-x-3">
                  <span className="text-2xl font-bold text-amber-700">
                    {performanceData.noShowTrips}
                  </span>
                  <span className="text-sm text-amber-600">
                    {((performanceData.noShowTrips / performanceData.totalTrips) * 100).toFixed(1)}%
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Performance Indicators */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-white rounded-xl border border-gray-200 p-4">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium text-gray-700">On-Time %</span>
                <Clock className="w-4 h-4 text-gray-400" />
              </div>
              <div className="flex items-end space-x-2">
                <span className="text-3xl font-bold text-gray-900">
                  {performanceData.onTimePercentage}%
                </span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2 mt-3">
                <div
                  className="bg-green-500 h-2 rounded-full"
                  style={{ width: `${performanceData.onTimePercentage}%` }}
                ></div>
              </div>
            </div>

            <div className="bg-white rounded-xl border border-gray-200 p-4">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium text-gray-700">Response Time</span>
                <AlertCircle className="w-4 h-4 text-gray-400" />
              </div>
              <div className="flex items-end space-x-2">
                <span className="text-3xl font-bold text-gray-900">
                  {performanceData.responseTime}
                </span>
                <span className="text-lg text-gray-600 mb-1">min</span>
              </div>
              <div className="text-xs text-green-600 mt-1">Excellent response time</div>
            </div>

            <div className="bg-white rounded-xl border border-gray-200 p-4">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium text-gray-700">Acceptance Rate</span>
                <Award className="w-4 h-4 text-gray-400" />
              </div>
              <div className="flex items-end space-x-2">
                <span className="text-3xl font-bold text-gray-900">
                  {performanceData.acceptance}%
                </span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2 mt-3">
                <div
                  className="bg-blue-500 h-2 rounded-full"
                  style={{ width: `${performanceData.acceptance}%` }}
                ></div>
              </div>
            </div>
          </div>

          {/* Recent Achievements */}
          <div className="bg-gradient-to-r from-amber-50 to-yellow-50 rounded-xl border border-amber-200 p-6">
            <div className="flex items-center space-x-2 mb-4">
              <Award className="w-6 h-6 text-amber-600" />
              <h3 className="text-lg font-bold text-gray-900">Recent Achievements</h3>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div className="flex items-center space-x-3 p-3 bg-white rounded-lg">
                <div className="w-10 h-10 bg-amber-100 rounded-full flex items-center justify-center">
                  <Star className="w-5 h-5 text-amber-600" />
                </div>
                <div>
                  <div className="font-semibold text-gray-900">Top Rated Driver</div>
                  <div className="text-xs text-gray-600">This month</div>
                </div>
              </div>
              <div className="flex items-center space-x-3 p-3 bg-white rounded-lg">
                <div className="w-10 h-10 bg-green-100 rounded-full flex items-center justify-center">
                  <TrendingUp className="w-5 h-5 text-green-600" />
                </div>
                <div>
                  <div className="font-semibold text-gray-900">100+ Trips</div>
                  <div className="text-xs text-gray-600">Milestone reached</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
