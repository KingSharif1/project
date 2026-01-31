import { Trip } from '../types';

export interface NoShowPrediction {
  tripId: string;
  riskScore: number;
  riskLevel: 'low' | 'medium' | 'high' | 'critical';
  factors: string[];
  recommendations: string[];
  confidence: number;
}

export interface NoShowFactors {
  historicalNoShows: number;
  historicalCancellations: number;
  daysSinceLastTrip: number;
  isWeekend: boolean;
  isEarlyMorning: boolean;
  isLateEvening: boolean;
  weatherCondition?: 'good' | 'poor' | 'severe';
  advanceNotice: number; // hours
  hasPhoneNumber: boolean;
  hasEmail: boolean;
  tripType: string;
  patientAge?: number;
}

export function calculateNoShowRisk(trip: Trip, historicalData?: Partial<NoShowFactors>): NoShowPrediction {
  const factors: string[] = [];
  let riskScore = 0;
  const recommendations: string[] = [];

  const tripDate = new Date(trip.scheduledTime);
  const now = new Date();
  const hoursUntilTrip = (tripDate.getTime() - now.getTime()) / (1000 * 60 * 60);

  // Factor 1: Historical no-shows (30% weight)
  const historicalNoShows = historicalData?.historicalNoShows || 0;
  if (historicalNoShows > 3) {
    riskScore += 30;
    factors.push('Multiple previous no-shows');
    recommendations.push('Call patient 24 hours before pickup');
    recommendations.push('Send SMS reminder 2 hours before');
  } else if (historicalNoShows > 0) {
    riskScore += 15;
    factors.push('Previous no-show history');
  }

  // Factor 2: Recent cancellations (15% weight)
  const historicalCancellations = historicalData?.historicalCancellations || 0;
  if (historicalCancellations > 2) {
    riskScore += 15;
    factors.push('Multiple recent cancellations');
  } else if (historicalCancellations > 0) {
    riskScore += 8;
    factors.push('Previous cancellation');
  }

  // Factor 3: Time of day (10% weight)
  const hour = tripDate.getHours();
  if (hour < 6) {
    riskScore += 10;
    factors.push('Very early morning trip');
    recommendations.push('Confirm pickup time evening before');
  } else if (hour < 7 || hour > 20) {
    riskScore += 5;
    factors.push('Early morning or late evening trip');
  }

  // Factor 4: Day of week (10% weight)
  const dayOfWeek = tripDate.getDay();
  if (dayOfWeek === 0 || dayOfWeek === 6) {
    riskScore += 10;
    factors.push('Weekend trip');
    recommendations.push('Send extra confirmation on Friday');
  }

  // Factor 5: Advance notice (15% weight)
  if (hoursUntilTrip < 12) {
    riskScore += 15;
    factors.push('Last-minute booking');
    recommendations.push('Call to confirm immediately');
  } else if (hoursUntilTrip < 24) {
    riskScore += 8;
    factors.push('Short notice booking');
  }

  // Factor 6: Contact information (10% weight)
  if (!trip.customerPhone && !trip.customerEmail) {
    riskScore += 10;
    factors.push('No contact information');
    recommendations.push('Update patient contact details urgently');
  } else if (!trip.customerPhone) {
    riskScore += 5;
    factors.push('No phone number on file');
  }

  // Factor 7: Trip type (5% weight)
  if (trip.tripType === 'private') {
    riskScore += 5;
    factors.push('Private trip (higher no-show rate)');
  }

  // Factor 8: Weather (5% weight)
  if (historicalData?.weatherCondition === 'severe') {
    riskScore += 5;
    factors.push('Severe weather expected');
    recommendations.push('Proactive weather-related confirmation');
  } else if (historicalData?.weatherCondition === 'poor') {
    riskScore += 3;
    factors.push('Poor weather conditions');
  }

  // Determine risk level
  let riskLevel: 'low' | 'medium' | 'high' | 'critical';
  if (riskScore >= 60) {
    riskLevel = 'critical';
    recommendations.push('Consider double-booking or having backup');
    recommendations.push('Personal call required from dispatcher');
  } else if (riskScore >= 40) {
    riskLevel = 'high';
    recommendations.push('Multiple confirmation attempts recommended');
  } else if (riskScore >= 20) {
    riskLevel = 'medium';
    recommendations.push('Standard confirmation protocol');
  } else {
    riskLevel = 'low';
    recommendations.push('Normal monitoring sufficient');
  }

  // Calculate confidence based on available data
  let confidence = 70;
  if (historicalData?.historicalNoShows !== undefined) confidence += 10;
  if (historicalData?.historicalCancellations !== undefined) confidence += 10;
  if (historicalData?.daysSinceLastTrip !== undefined) confidence += 5;
  if (historicalData?.weatherCondition) confidence += 5;

  return {
    tripId: trip.id,
    riskScore: Math.min(riskScore, 100),
    riskLevel,
    factors,
    recommendations: [...new Set(recommendations)], // Remove duplicates
    confidence: Math.min(confidence, 100),
  };
}

export function getNoShowPredictions(trips: Trip[]): NoShowPrediction[] {
  return trips
    .filter(t => t.status === 'scheduled' || t.status === 'pending' || t.status === 'assigned')
    .map(trip => calculateNoShowRisk(trip))
    .sort((a, b) => b.riskScore - a.riskScore);
}

export function getHighRiskTrips(trips: Trip[]): Trip[] {
  const predictions = getNoShowPredictions(trips);
  const highRiskIds = predictions
    .filter(p => p.riskLevel === 'high' || p.riskLevel === 'critical')
    .map(p => p.tripId);

  return trips.filter(t => highRiskIds.includes(t.id));
}

export function generateNoShowReport(trips: Trip[]): {
  totalTrips: number;
  lowRisk: number;
  mediumRisk: number;
  highRisk: number;
  criticalRisk: number;
  avgRiskScore: number;
  topFactors: { factor: string; count: number }[];
} {
  const predictions = getNoShowPredictions(trips);

  const lowRisk = predictions.filter(p => p.riskLevel === 'low').length;
  const mediumRisk = predictions.filter(p => p.riskLevel === 'medium').length;
  const highRisk = predictions.filter(p => p.riskLevel === 'high').length;
  const criticalRisk = predictions.filter(p => p.riskLevel === 'critical').length;

  const avgRiskScore = predictions.length > 0
    ? predictions.reduce((sum, p) => sum + p.riskScore, 0) / predictions.length
    : 0;

  // Aggregate all factors
  const factorCounts: Record<string, number> = {};
  predictions.forEach(p => {
    p.factors.forEach(factor => {
      factorCounts[factor] = (factorCounts[factor] || 0) + 1;
    });
  });

  const topFactors = Object.entries(factorCounts)
    .map(([factor, count]) => ({ factor, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 10);

  return {
    totalTrips: predictions.length,
    lowRisk,
    mediumRisk,
    highRisk,
    criticalRisk,
    avgRiskScore,
    topFactors,
  };
}
