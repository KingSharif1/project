import React, { useState, useEffect } from 'react';
import { Trophy, Star, TrendingUp, Award, Zap, Target, Medal, Crown, Gift, Fire } from 'lucide-react';
import { Driver } from '../types';

interface DriverStats {
  driverId: string;
  driverName: string;
  points: number;
  level: number;
  streak: number;
  badges: Badge[];
  rank: number;
  weeklyTrips: number;
  monthlyTrips: number;
  onTimeRate: number;
  rating: number;
  perfectDays: number;
}

interface Badge {
  id: string;
  name: string;
  description: string;
  icon: string;
  rarity: 'common' | 'rare' | 'epic' | 'legendary';
  earnedAt: string;
}

interface Achievement {
  id: string;
  title: string;
  description: string;
  icon: any;
  progress: number;
  target: number;
  points: number;
  completed: boolean;
}

export const DriverGamification: React.FC<{ drivers: Driver[] }> = ({ drivers }) => {
  const [leaderboard, setLeaderboard] = useState<DriverStats[]>([]);
  const [selectedDriver, setSelectedDriver] = useState<DriverStats | null>(null);
  const [timeFrame, setTimeFrame] = useState<'week' | 'month' | 'all'>('month');

  useEffect(() => {
    generateLeaderboard();
  }, [drivers, timeFrame]);

  const generateLeaderboard = () => {
    const stats: DriverStats[] = drivers.map((driver, index) => {
      const basePoints = driver.totalTrips * 10;
      const ratingBonus = Math.floor(driver.rating * 50);
      const points = basePoints + ratingBonus + Math.floor(Math.random() * 200);

      const badges = generateBadges(driver);
      const level = Math.floor(points / 500) + 1;
      const streak = Math.floor(Math.random() * 15);

      return {
        driverId: driver.id,
        driverName: driver.name,
        points,
        level,
        streak,
        badges,
        rank: index + 1,
        weeklyTrips: Math.floor(Math.random() * 30),
        monthlyTrips: driver.totalTrips,
        onTimeRate: 85 + Math.random() * 15,
        rating: driver.rating,
        perfectDays: Math.floor(Math.random() * 20),
      };
    });

    const sorted = stats.sort((a, b) => b.points - a.points);
    sorted.forEach((stat, index) => {
      stat.rank = index + 1;
    });

    setLeaderboard(sorted);
  };

  const generateBadges = (driver: Driver): Badge[] => {
    const badges: Badge[] = [];

    if (driver.totalTrips >= 100) {
      badges.push({
        id: 'century',
        name: 'Century Club',
        description: '100+ completed trips',
        icon: '💯',
        rarity: 'rare',
        earnedAt: new Date().toISOString(),
      });
    }

    if (driver.rating >= 4.8) {
      badges.push({
        id: 'star-performer',
        name: 'Star Performer',
        description: '4.8+ rating',
        icon: '⭐',
        rarity: 'epic',
        earnedAt: new Date().toISOString(),
      });
    }

    if (driver.totalTrips >= 200) {
      badges.push({
        id: 'veteran',
        name: 'Veteran Driver',
        description: '200+ completed trips',
        icon: '🏆',
        rarity: 'legendary',
        earnedAt: new Date().toISOString(),
      });
    }

    return badges;
  };

  const getRankIcon = (rank: number) => {
    if (rank === 1) return <Crown className="w-8 h-8 text-yellow-500" />;
    if (rank === 2) return <Medal className="w-8 h-8 text-gray-400" />;
    if (rank === 3) return <Medal className="w-8 h-8 text-orange-600" />;
    return <Trophy className="w-6 h-6 text-gray-400" />;
  };

  const getRankColor = (rank: number) => {
    if (rank === 1) return 'bg-gradient-to-r from-yellow-400 to-yellow-600';
    if (rank === 2) return 'bg-gradient-to-r from-gray-300 to-gray-500';
    if (rank === 3) return 'bg-gradient-to-r from-orange-400 to-orange-600';
    return 'bg-gray-100';
  };

  const getBadgeRarityColor = (rarity: string) => {
    switch (rarity) {
      case 'legendary':
        return 'from-purple-500 to-pink-500';
      case 'epic':
        return 'from-blue-500 to-purple-500';
      case 'rare':
        return 'from-green-500 to-blue-500';
      default:
        return 'from-gray-400 to-gray-600';
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center space-x-2">
            <Trophy className="w-8 h-8 text-yellow-500" />
            <span>Driver Leaderboard</span>
          </h1>
          <p className="text-gray-600 mt-1">Top performing drivers this period</p>
        </div>

        <div className="flex space-x-2">
          {(['week', 'month', 'all'] as const).map((period) => (
            <button
              key={period}
              onClick={() => setTimeFrame(period)}
              className={`px-4 py-2 rounded-lg font-medium transition-all ${
                timeFrame === period
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              {period === 'week' && 'This Week'}
              {period === 'month' && 'This Month'}
              {period === 'all' && 'All Time'}
            </button>
          ))}
        </div>
      </div>

      {/* Top 3 Podium */}
      {leaderboard.length >= 3 && (
        <div className="grid grid-cols-3 gap-4 mb-8">
          {/* Second Place */}
          <div className="pt-12">
            <div className="bg-white rounded-xl shadow-lg border-2 border-gray-300 p-6 text-center">
              <div className="w-16 h-16 bg-gray-200 rounded-full mx-auto mb-3 flex items-center justify-center">
                <Medal className="w-10 h-10 text-gray-500" />
              </div>
              <div className="mb-2">
                <div className="text-4xl font-bold text-gray-700">2</div>
                <div className="text-xs text-gray-500 uppercase font-semibold">Silver</div>
              </div>
              <h3 className="font-bold text-gray-900 text-lg">{leaderboard[1].driverName}</h3>
              <p className="text-2xl font-bold text-gray-900 mt-2">{leaderboard[1].points.toLocaleString()}</p>
              <p className="text-sm text-gray-600">points</p>
            </div>
          </div>

          {/* First Place */}
          <div>
            <div className={`${getRankColor(1)} rounded-xl shadow-2xl border-4 border-yellow-500 p-6 text-center text-white`}>
              <div className="w-20 h-20 bg-white bg-opacity-20 rounded-full mx-auto mb-3 flex items-center justify-center backdrop-blur-sm">
                <Crown className="w-12 h-12 text-yellow-300" />
              </div>
              <div className="mb-2">
                <div className="text-5xl font-bold">1</div>
                <div className="text-xs uppercase font-semibold tracking-wider">Champion</div>
              </div>
              <h3 className="font-bold text-xl">{leaderboard[0].driverName}</h3>
              <p className="text-3xl font-bold mt-2">{leaderboard[0].points.toLocaleString()}</p>
              <p className="text-sm opacity-90">points</p>
              <div className="mt-4 flex items-center justify-center space-x-2">
                <Fire className="w-5 h-5" />
                <span className="font-semibold">{leaderboard[0].streak} day streak!</span>
              </div>
            </div>
          </div>

          {/* Third Place */}
          <div className="pt-12">
            <div className="bg-white rounded-xl shadow-lg border-2 border-orange-300 p-6 text-center">
              <div className="w-16 h-16 bg-orange-100 rounded-full mx-auto mb-3 flex items-center justify-center">
                <Medal className="w-10 h-10 text-orange-600" />
              </div>
              <div className="mb-2">
                <div className="text-4xl font-bold text-orange-700">3</div>
                <div className="text-xs text-orange-600 uppercase font-semibold">Bronze</div>
              </div>
              <h3 className="font-bold text-gray-900 text-lg">{leaderboard[2].driverName}</h3>
              <p className="text-2xl font-bold text-gray-900 mt-2">{leaderboard[2].points.toLocaleString()}</p>
              <p className="text-sm text-gray-600">points</p>
            </div>
          </div>
        </div>
      )}

      {/* Full Leaderboard */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200">
        <div className="p-6 border-b border-gray-200">
          <h2 className="text-xl font-bold text-gray-900">Full Rankings</h2>
        </div>

        <div className="divide-y divide-gray-200">
          {leaderboard.map((driver, index) => (
            <div
              key={driver.driverId}
              className={`p-4 hover:bg-gray-50 transition-colors cursor-pointer ${
                index < 3 ? 'bg-blue-50 bg-opacity-30' : ''
              }`}
              onClick={() => setSelectedDriver(driver)}
            >
              <div className="flex items-center space-x-4">
                {/* Rank */}
                <div className="w-12 flex items-center justify-center">
                  {getRankIcon(driver.rank)}
                </div>

                {/* Driver Info */}
                <div className="flex-1">
                  <div className="flex items-center space-x-3">
                    <h3 className="font-bold text-gray-900">{driver.driverName}</h3>
                    <div className="flex items-center space-x-1">
                      <Star className="w-4 h-4 text-yellow-500 fill-yellow-500" />
                      <span className="text-sm font-medium text-gray-700">{driver.rating.toFixed(1)}</span>
                    </div>
                    <span className="text-sm text-gray-600">Level {driver.level}</span>
                  </div>

                  <div className="flex items-center space-x-4 mt-2">
                    <div className="text-sm text-gray-600">
                      <span className="font-medium">{driver.monthlyTrips}</span> trips
                    </div>
                    <div className="text-sm text-gray-600">
                      <span className="font-medium">{driver.onTimeRate.toFixed(0)}%</span> on-time
                    </div>
                    {driver.streak > 0 && (
                      <div className="flex items-center space-x-1 text-sm text-orange-600">
                        <Fire className="w-4 h-4" />
                        <span className="font-medium">{driver.streak} days</span>
                      </div>
                    )}
                  </div>

                  {/* Badges */}
                  {driver.badges.length > 0 && (
                    <div className="flex items-center space-x-2 mt-2">
                      {driver.badges.slice(0, 3).map((badge) => (
                        <div
                          key={badge.id}
                          className={`px-2 py-1 bg-gradient-to-r ${getBadgeRarityColor(
                            badge.rarity
                          )} rounded-lg text-white text-xs font-semibold`}
                          title={badge.description}
                        >
                          {badge.icon} {badge.name}
                        </div>
                      ))}
                      {driver.badges.length > 3 && (
                        <span className="text-xs text-gray-500">+{driver.badges.length - 3} more</span>
                      )}
                    </div>
                  )}
                </div>

                {/* Points */}
                <div className="text-right">
                  <p className="text-2xl font-bold text-blue-600">{driver.points.toLocaleString()}</p>
                  <p className="text-sm text-gray-600">points</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Achievements Section */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {[
          { title: 'Perfect Week', description: 'Complete 30 trips in 7 days', progress: 23, target: 30, icon: Target },
          { title: 'Five Star Hero', description: 'Maintain 5.0 rating for 20 trips', progress: 15, target: 20, icon: Star },
          { title: 'Speed Demon', description: 'Complete 50 trips this month', progress: 42, target: 50, icon: Zap },
          { title: 'Customer Favorite', description: 'Get 100 five-star ratings', progress: 78, target: 100, icon: Award },
          { title: 'Early Bird', description: '20 early morning pickups', progress: 12, target: 20, icon: TrendingUp },
          { title: 'Streak Master', description: 'Achieve 30-day streak', progress: 18, target: 30, icon: Fire },
        ].map((achievement, index) => (
          <div key={index} className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
            <div className="flex items-start space-x-3 mb-3">
              <div className="p-2 bg-blue-100 rounded-lg">
                <achievement.icon className="w-5 h-5 text-blue-600" />
              </div>
              <div className="flex-1">
                <h3 className="font-semibold text-gray-900">{achievement.title}</h3>
                <p className="text-xs text-gray-600">{achievement.description}</p>
              </div>
            </div>

            {/* Progress Bar */}
            <div className="space-y-1">
              <div className="flex items-center justify-between text-sm">
                <span className="text-gray-600">{achievement.progress} / {achievement.target}</span>
                <span className="text-gray-600">{Math.floor((achievement.progress / achievement.target) * 100)}%</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div
                  className="bg-blue-600 h-2 rounded-full transition-all"
                  style={{ width: `${(achievement.progress / achievement.target) * 100}%` }}
                />
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Rewards Section */}
      <div className="bg-gradient-to-r from-purple-500 to-pink-500 rounded-xl shadow-lg p-6 text-white">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold mb-2 flex items-center space-x-2">
              <Gift className="w-7 h-7" />
              <span>Monthly Rewards</span>
            </h2>
            <p className="opacity-90">Top 3 drivers win cash bonuses!</p>
          </div>
          <div className="text-right">
            <p className="text-sm opacity-90">1st Place</p>
            <p className="text-4xl font-bold">$500</p>
          </div>
        </div>
      </div>
    </div>
  );
};
