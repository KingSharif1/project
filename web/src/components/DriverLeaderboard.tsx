import React, { useMemo } from 'react';
import { Trophy, Star, TrendingUp, Award } from 'lucide-react';
import { useApp } from '../context/AppContext';

export const DriverLeaderboard: React.FC = () => {
  const { drivers, trips } = useApp();

  const leaderboard = useMemo(() => {
    return drivers.map(driver => {
      const driverTrips = trips.filter(t => t.driverId === driver.id && t.status === 'completed');
      const revenue = driverTrips.reduce((sum, t) => sum + t.fare, 0);
      const totalDistance = driverTrips.reduce((sum, t) => sum + t.distance, 0);

      return {
        ...driver,
        completedTrips: driverTrips.length,
        revenue,
        totalDistance,
        score: (driverTrips.length * 10) + (driver.rating * 20) + (revenue / 10)
      };
    }).sort((a, b) => b.score - a.score).slice(0, 5);
  }, [drivers, trips]);

  const getMedalColor = (position: number) => {
    switch (position) {
      case 0: return 'from-yellow-400 to-yellow-600';
      case 1: return 'from-gray-300 to-gray-500';
      case 2: return 'from-orange-400 to-orange-600';
      default: return 'from-blue-400 to-blue-600';
    }
  };

  const getMedalIcon = (position: number) => {
    if (position === 0) return <Trophy className="w-6 h-6 text-yellow-500" />;
    if (position === 1) return <Award className="w-6 h-6 text-gray-400" />;
    if (position === 2) return <Award className="w-6 h-6 text-orange-500" />;
    return <Star className="w-5 h-5 text-blue-500" />;
  };

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
      <div className="flex items-center space-x-3 mb-6">
        <Trophy className="w-6 h-6 text-amber-600" />
        <h2 className="text-xl font-bold text-gray-900">Driver Leaderboard</h2>
        <span className="text-sm text-gray-500 ml-auto">Top 5 This Month</span>
      </div>

      <div className="space-y-4">
        {leaderboard.map((driver, index) => (
          <div
            key={driver.id}
            className={`relative overflow-hidden rounded-lg border-2 transition-all hover:shadow-md ${
              index === 0 ? 'border-yellow-400 bg-yellow-50' :
              index === 1 ? 'border-gray-400 bg-gray-50' :
              index === 2 ? 'border-orange-400 bg-orange-50' :
              'border-gray-200 bg-white'
            }`}
          >
            <div className="flex items-center p-4 space-x-4">
              <div className={`w-16 h-16 bg-gradient-to-br ${getMedalColor(index)} rounded-full flex items-center justify-center flex-shrink-0 shadow-lg`}>
                <span className="text-2xl font-bold text-white">#{index + 1}</span>
              </div>

              <div className="flex-1 min-w-0">
                <div className="flex items-center space-x-2 mb-1">
                  <h3 className="font-bold text-gray-900 text-lg truncate">{driver.name}</h3>
                  {getMedalIcon(index)}
                </div>

                <div className="grid grid-cols-3 gap-3 mt-2">
                  <div>
                    <p className="text-xs text-gray-500">Trips</p>
                    <p className="text-sm font-semibold text-gray-900">{driver.completedTrips}</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500">Revenue</p>
                    <p className="text-sm font-semibold text-gray-900">${driver.revenue.toFixed(0)}</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500">Rating</p>
                    <div className="flex items-center space-x-1">
                      <Star className="w-3 h-3 text-amber-500 fill-amber-500" />
                      <p className="text-sm font-semibold text-gray-900">{driver.rating.toFixed(1)}</p>
                    </div>
                  </div>
                </div>
              </div>

              {index < 3 && (
                <div className="flex flex-col items-center">
                  <TrendingUp className="w-6 h-6 text-green-500" />
                  <span className="text-xs text-green-600 font-semibold">Top 3</span>
                </div>
              )}
            </div>

            {index === 0 && (
              <div className="absolute top-0 right-0 bg-yellow-400 text-yellow-900 text-xs font-bold px-3 py-1 rounded-bl-lg">
                CHAMPION
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
};
