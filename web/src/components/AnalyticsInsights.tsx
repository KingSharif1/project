import React, { useState } from 'react';
import { TrendingUp, TrendingDown, Users, FileText, AlertCircle, Calendar, DollarSign, Award, BarChart3, Download } from 'lucide-react';
import * as XLSX from 'xlsx';

interface AnalyticsInsightsProps {
  drivers: any[];
  trips: any[];
}

export const AnalyticsInsights: React.FC<AnalyticsInsightsProps> = ({ drivers, trips }) => {
  const [timeRange, setTimeRange] = useState('30');

  // Calculate compliance rate
  const calculateComplianceRate = () => {
    let totalDocuments = 0;
    let compliantDocuments = 0;

    drivers.forEach(driver => {
      const docs = [
        driver.license_expiry_date,
        driver.insurance_expiry_date,
        driver.registration_expiry_date,
        driver.medical_cert_expiry_date,
        driver.background_check_expiry_date
      ];

      totalDocuments += docs.length;

      docs.forEach(doc => {
        if (doc) {
          const expiryDate = new Date(doc);
          const today = new Date();
          if (expiryDate >= today) {
            compliantDocuments++;
          }
        }
      });
    });

    return totalDocuments > 0 ? (compliantDocuments / totalDocuments) * 100 : 0;
  };

  // Calculate average time to renewal
  const calculateAvgTimeToRenewal = () => {
    let totalDays = 0;
    let count = 0;

    drivers.forEach(driver => {
      const docs = [
        driver.license_expiry_date,
        driver.insurance_expiry_date,
        driver.registration_expiry_date,
        driver.medical_cert_expiry_date,
        driver.background_check_expiry_date
      ];

      docs.forEach(doc => {
        if (doc) {
          const expiryDate = new Date(doc);
          const today = new Date();
          const daysUntilExpiry = Math.floor((expiryDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));

          if (daysUntilExpiry > 0 && daysUntilExpiry < 90) {
            totalDays += daysUntilExpiry;
            count++;
          }
        }
      });
    });

    return count > 0 ? Math.round(totalDays / count) : 0;
  };

  // Find drivers with most expired documents
  const getDriversWithMostExpired = () => {
    const driverExpiredCounts = drivers.map(driver => {
      let expiredCount = 0;
      const docs = [
        driver.license_expiry_date,
        driver.insurance_expiry_date,
        driver.registration_expiry_date,
        driver.medical_cert_expiry_date,
        driver.background_check_expiry_date
      ];

      docs.forEach(doc => {
        if (doc) {
          const expiryDate = new Date(doc);
          const today = new Date();
          if (expiryDate < today) {
            expiredCount++;
          }
        }
      });

      return {
        name: driver.name,
        expiredCount,
        totalTrips: driver.totalTrips || 0
      };
    });

    return driverExpiredCounts
      .filter(d => d.expiredCount > 0)
      .sort((a, b) => b.expiredCount - a.expiredCount)
      .slice(0, 5);
  };

  // Predict renewals for next month
  const predictNextMonthRenewals = () => {
    let count = 0;
    const today = new Date();
    const nextMonth = new Date(today.getFullYear(), today.getMonth() + 1, today.getDate());

    drivers.forEach(driver => {
      const docs = [
        driver.license_expiry_date,
        driver.insurance_expiry_date,
        driver.registration_expiry_date,
        driver.medical_cert_expiry_date,
        driver.background_check_expiry_date
      ];

      docs.forEach(doc => {
        if (doc) {
          const expiryDate = new Date(doc);
          if (expiryDate >= today && expiryDate <= nextMonth) {
            count++;
          }
        }
      });
    });

    return count;
  };

  // Calculate cost of non-compliance (mock)
  const calculateNonComplianceCost = () => {
    const expiredDrivers = drivers.filter(driver => {
      const docs = [
        driver.license_expiry_date,
        driver.insurance_expiry_date,
        driver.registration_expiry_date,
        driver.medical_cert_expiry_date,
        driver.background_check_expiry_date
      ];

      return docs.some(doc => {
        if (doc) {
          const expiryDate = new Date(doc);
          return expiryDate < new Date();
        }
        return false;
      });
    });

    // Assume $500 per expired driver per month
    return expiredDrivers.length * 500;
  };

  const complianceRate = calculateComplianceRate();
  const avgTimeToRenewal = calculateAvgTimeToRenewal();
  const driversWithExpired = getDriversWithMostExpired();
  const nextMonthRenewals = predictNextMonthRenewals();
  const nonComplianceCost = calculateNonComplianceCost();

  const complianceOverTime = [
    { month: 'Jan', rate: 85 },
    { month: 'Feb', rate: 87 },
    { month: 'Mar', rate: 90 },
    { month: 'Apr', rate: 88 },
    { month: 'May', rate: 92 },
    { month: 'Jun', rate: complianceRate }
  ];

  const handleExportReport = () => {
    const data = [
      { Metric: 'Compliance Rate', Value: `${complianceRate.toFixed(1)}%` },
      { Metric: 'Average Days to Renewal', Value: avgTimeToRenewal },
      { Metric: 'Predicted Renewals Next Month', Value: nextMonthRenewals },
      { Metric: 'Estimated Non-Compliance Cost', Value: `$${nonComplianceCost}` },
      {},
      { Metric: 'Drivers with Most Expired Documents', Value: '' },
      ...driversWithExpired.map(d => ({
        Metric: d.name,
        Value: `${d.expiredCount} expired`
      }))
    ];

    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Analytics Report');
    XLSX.writeFile(wb, `analytics_report_${new Date().toISOString().split('T')[0]}.xlsx`);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Analytics & Insights</h1>
          <p className="text-gray-600">Data-driven insights for better decision making</p>
        </div>
        <div className="flex items-center space-x-3">
          <select
            value={timeRange}
            onChange={(e) => setTimeRange(e.target.value)}
            className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            <option value="7">Last 7 days</option>
            <option value="30">Last 30 days</option>
            <option value="90">Last 90 days</option>
            <option value="365">Last year</option>
          </select>
          <button
            onClick={handleExportReport}
            className="flex items-center space-x-2 bg-green-600 text-white px-6 py-2 rounded-lg font-semibold hover:bg-green-700 transition-colors"
          >
            <Download className="w-4 h-4" />
            <span>Export Report</span>
          </button>
        </div>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl shadow-sm p-6 text-white">
          <div className="flex items-center justify-between mb-4">
            <BarChart3 className="w-8 h-8 opacity-80" />
            <div className={`px-2 py-1 rounded-full text-xs font-semibold ${
              complianceRate >= 90 ? 'bg-green-400 text-green-900' : 'bg-amber-400 text-amber-900'
            }`}>
              {complianceRate >= 90 ? (
                <span className="flex items-center space-x-1">
                  <TrendingUp className="w-3 h-3" />
                  <span>Good</span>
                </span>
              ) : (
                <span className="flex items-center space-x-1">
                  <TrendingDown className="w-3 h-3" />
                  <span>Needs Attention</span>
                </span>
              )}
            </div>
          </div>
          <div className="text-3xl font-bold mb-1">{complianceRate.toFixed(1)}%</div>
          <div className="text-blue-100">Document Compliance Rate</div>
        </div>

        <div className="bg-gradient-to-br from-green-500 to-emerald-600 rounded-xl shadow-sm p-6 text-white">
          <div className="flex items-center justify-between mb-4">
            <Calendar className="w-8 h-8 opacity-80" />
            <div className="px-2 py-1 bg-green-400 text-green-900 rounded-full text-xs font-semibold">
              Days
            </div>
          </div>
          <div className="text-3xl font-bold mb-1">{avgTimeToRenewal}</div>
          <div className="text-green-100">Avg Time to Renewal</div>
        </div>

        <div className="bg-gradient-to-br from-amber-500 to-orange-600 rounded-xl shadow-sm p-6 text-white">
          <div className="flex items-center justify-between mb-4">
            <AlertCircle className="w-8 h-8 opacity-80" />
            <div className="px-2 py-1 bg-amber-400 text-amber-900 rounded-full text-xs font-semibold">
              Predicted
            </div>
          </div>
          <div className="text-3xl font-bold mb-1">{nextMonthRenewals}</div>
          <div className="text-amber-100">Renewals Next Month</div>
        </div>

        <div className="bg-gradient-to-br from-red-500 to-pink-600 rounded-xl shadow-sm p-6 text-white">
          <div className="flex items-center justify-between mb-4">
            <DollarSign className="w-8 h-8 opacity-80" />
            <div className="px-2 py-1 bg-red-400 text-red-900 rounded-full text-xs font-semibold">
              Estimated
            </div>
          </div>
          <div className="text-3xl font-bold mb-1">${nonComplianceCost.toLocaleString()}</div>
          <div className="text-red-100">Non-Compliance Cost</div>
        </div>
      </div>

      {/* Compliance Over Time */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <h2 className="text-xl font-bold text-gray-900 mb-6">Compliance Rate Over Time</h2>
        <div className="h-64 flex items-end justify-between space-x-4">
          {complianceOverTime.map((item, index) => {
            const height = (item.rate / 100) * 100;
            return (
              <div key={index} className="flex-1 flex flex-col items-center">
                <div
                  className="w-full bg-gradient-to-t from-blue-600 to-cyan-500 rounded-t-lg transition-all hover:from-blue-700 hover:to-cyan-600"
                  style={{ height: `${height}%` }}
                ></div>
                <div className="mt-2 text-sm font-semibold text-gray-600">{item.month}</div>
                <div className="text-xs text-gray-500">{item.rate}%</div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Drivers with Most Expired Documents */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <h2 className="text-xl font-bold text-gray-900 mb-6 flex items-center">
          <Users className="w-6 h-6 mr-2 text-red-600" />
          Drivers Needing Attention
        </h2>
        {driversWithExpired.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            <Award className="w-12 h-12 mx-auto mb-2 opacity-50" />
            <p>All drivers have valid documents!</p>
          </div>
        ) : (
          <div className="space-y-3">
            {driversWithExpired.map((driver, index) => (
              <div
                key={index}
                className="flex items-center justify-between p-4 bg-red-50 border border-red-200 rounded-lg"
              >
                <div className="flex items-center space-x-4">
                  <div className="w-10 h-10 bg-red-100 rounded-full flex items-center justify-center">
                    <span className="text-red-600 font-bold">{index + 1}</span>
                  </div>
                  <div>
                    <div className="font-semibold text-gray-900">{driver.name}</div>
                    <div className="text-sm text-gray-600">{driver.totalTrips} total trips</div>
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-2xl font-bold text-red-600">{driver.expiredCount}</div>
                  <div className="text-sm text-gray-600">Expired Docs</div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Insights & Recommendations */}
      <div className="bg-gradient-to-br from-purple-50 to-blue-50 border border-purple-200 rounded-xl p-6">
        <h2 className="text-xl font-bold text-gray-900 mb-4 flex items-center">
          <TrendingUp className="w-6 h-6 mr-2 text-purple-600" />
          Insights & Recommendations
        </h2>
        <div className="space-y-3">
          {complianceRate < 90 && (
            <div className="flex items-start space-x-3 p-3 bg-white rounded-lg">
              <AlertCircle className="w-5 h-5 text-amber-600 mt-0.5 flex-shrink-0" />
              <div>
                <div className="font-semibold text-gray-900">Compliance rate below target</div>
                <div className="text-sm text-gray-600">
                  Your current compliance rate is {complianceRate.toFixed(1)}%. Consider implementing more frequent reminders and follow-ups.
                </div>
              </div>
            </div>
          )}

          {nextMonthRenewals > 10 && (
            <div className="flex items-start space-x-3 p-3 bg-white rounded-lg">
              <Calendar className="w-5 h-5 text-blue-600 mt-0.5 flex-shrink-0" />
              <div>
                <div className="font-semibold text-gray-900">High renewal volume upcoming</div>
                <div className="text-sm text-gray-600">
                  {nextMonthRenewals} documents will expire next month. Start sending renewal notices early to avoid last-minute rushes.
                </div>
              </div>
            </div>
          )}

          {nonComplianceCost > 1000 && (
            <div className="flex items-start space-x-3 p-3 bg-white rounded-lg">
              <DollarSign className="w-5 h-5 text-red-600 mt-0.5 flex-shrink-0" />
              <div>
                <div className="font-semibold text-gray-900">High non-compliance cost</div>
                <div className="text-sm text-gray-600">
                  Estimated cost of non-compliance is ${nonComplianceCost.toLocaleString()}/month. Focus on bringing expired documents up to date immediately.
                </div>
              </div>
            </div>
          )}

          <div className="flex items-start space-x-3 p-3 bg-white rounded-lg">
            <Award className="w-5 h-5 text-green-600 mt-0.5 flex-shrink-0" />
            <div>
              <div className="font-semibold text-gray-900">Best practice</div>
              <div className="text-sm text-gray-600">
                Set up automated reminders 30, 14, and 7 days before expiry to maintain high compliance rates.
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
