import React, { useState, useEffect } from 'react';
import { Star, ThumbsUp, ThumbsDown, MessageSquare, Send, CheckCircle2, TrendingUp } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { Trip } from '../types';

interface FeedbackSurvey {
  id: string;
  trip_id: string;
  rating: number;
  driver_rating: number;
  vehicle_rating: number;
  timeliness_rating: number;
  professionalism_rating: number;
  comfort_rating: number;
  comments?: string;
  would_recommend?: boolean;
  issues_reported?: string[];
  survey_completed_at?: string;
}

interface FeedbackFormProps {
  trip: Trip;
  onSubmit: (feedback: Partial<FeedbackSurvey>) => void;
  onSkip?: () => void;
}

export const FeedbackForm: React.FC<FeedbackFormProps> = ({ trip, onSubmit, onSkip }) => {
  const [ratings, setRatings] = useState({
    overall: 0,
    driver: 0,
    vehicle: 0,
    timeliness: 0,
    professionalism: 0,
    comfort: 0,
  });

  const [comments, setComments] = useState('');
  const [wouldRecommend, setWouldRecommend] = useState<boolean | null>(null);
  const [issues, setIssues] = useState<string[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const ratingCategories = [
    { key: 'overall', label: 'Overall Experience', icon: Star },
    { key: 'driver', label: 'Driver Service', icon: Star },
    { key: 'vehicle', label: 'Vehicle Condition', icon: Star },
    { key: 'timeliness', label: 'On-Time Arrival', icon: Star },
    { key: 'professionalism', label: 'Professionalism', icon: Star },
    { key: 'comfort', label: 'Comfort', icon: Star },
  ];

  const commonIssues = [
    'Late arrival',
    'Vehicle cleanliness',
    'Driver behavior',
    'Uncomfortable ride',
    'Wrong pickup location',
    'Communication issues',
  ];

  const handleRatingChange = (category: string, value: number) => {
    setRatings(prev => ({ ...prev, [category]: value }));
  };

  const toggleIssue = (issue: string) => {
    setIssues(prev =>
      prev.includes(issue)
        ? prev.filter(i => i !== issue)
        : [...prev, issue]
    );
  };

  const handleSubmit = async () => {
    if (ratings.overall === 0) {
      alert('Please provide at least an overall rating');
      return;
    }

    setIsSubmitting(true);

    try {
      const feedback: Partial<FeedbackSurvey> = {
        trip_id: trip.id,
        rating: ratings.overall,
        driver_rating: ratings.driver,
        vehicle_rating: ratings.vehicle,
        timeliness_rating: ratings.timeliness,
        professionalism_rating: ratings.professionalism,
        comfort_rating: ratings.comfort,
        comments: comments || undefined,
        would_recommend: wouldRecommend || undefined,
        issues_reported: issues.length > 0 ? issues : undefined,
      };

      await onSubmit(feedback);
      setSubmitted(true);

      setTimeout(() => {
        if (onSkip) onSkip();
      }, 2000);
    } catch (error) {
      console.error('Error submitting feedback:', error);
      alert('Failed to submit feedback');
    } finally {
      setIsSubmitting(false);
    }
  };

  const StarRating: React.FC<{ value: number; onChange: (value: number) => void; label: string }> = ({
    value,
    onChange,
    label,
  }) => (
    <div className="space-y-2">
      <label className="text-sm font-medium text-gray-700">{label}</label>
      <div className="flex space-x-2">
        {[1, 2, 3, 4, 5].map((star) => (
          <button
            key={star}
            type="button"
            onClick={() => onChange(star)}
            onMouseEnter={() => {}}
            className="focus:outline-none transition-transform hover:scale-110"
          >
            <Star
              className={`w-8 h-8 ${
                star <= value
                  ? 'fill-yellow-400 text-yellow-400'
                  : 'text-gray-300'
              }`}
            />
          </button>
        ))}
        {value > 0 && (
          <span className="ml-3 text-sm text-gray-600 self-center">
            {value === 5 && '🌟 Excellent'}
            {value === 4 && '😊 Good'}
            {value === 3 && '😐 Average'}
            {value === 2 && '😕 Below Average'}
            {value === 1 && '😞 Poor'}
          </span>
        )}
      </div>
    </div>
  );

  if (submitted) {
    return (
      <div className="bg-white rounded-xl shadow-lg p-8 max-w-2xl mx-auto text-center">
        <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
          <CheckCircle2 className="w-10 h-10 text-green-600" />
        </div>
        <h2 className="text-3xl font-bold text-gray-900 mb-3">Thank You!</h2>
        <p className="text-gray-600 mb-6">
          Your feedback helps us improve our service and provide better care.
        </p>
        <p className="text-sm text-gray-500">
          Trip #{trip.tripNumber || trip.id.slice(0, 8)}
        </p>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl shadow-lg p-6 md:p-8 max-w-3xl mx-auto">
      <div className="text-center mb-8">
        <h2 className="text-2xl md:text-3xl font-bold text-gray-900 mb-2">
          How was your trip?
        </h2>
        <p className="text-gray-600">
          Trip #{trip.tripNumber || trip.id.slice(0, 8)} • {new Date(trip.scheduledTime).toLocaleDateString()}
        </p>
        <p className="text-sm text-gray-500 mt-1">
          {trip.pickupLocation} → {trip.dropoffLocation}
        </p>
      </div>

      <div className="space-y-6">
        {/* Overall Rating */}
        <div className="bg-blue-50 border-2 border-blue-200 rounded-lg p-6">
          <StarRating
            value={ratings.overall}
            onChange={(value) => handleRatingChange('overall', value)}
            label="Overall Experience"
          />
        </div>

        {/* Detailed Ratings */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <StarRating
            value={ratings.driver}
            onChange={(value) => handleRatingChange('driver', value)}
            label="Driver Service"
          />
          <StarRating
            value={ratings.timeliness}
            onChange={(value) => handleRatingChange('timeliness', value)}
            label="On-Time Performance"
          />
          <StarRating
            value={ratings.professionalism}
            onChange={(value) => handleRatingChange('professionalism', value)}
            label="Professionalism"
          />
          <StarRating
            value={ratings.comfort}
            onChange={(value) => handleRatingChange('comfort', value)}
            label="Ride Comfort"
          />
        </div>

        {/* Would Recommend */}
        <div className="space-y-2">
          <label className="text-sm font-medium text-gray-700">
            Would you recommend our service?
          </label>
          <div className="flex space-x-4">
            <button
              type="button"
              onClick={() => setWouldRecommend(true)}
              className={`flex-1 py-3 px-4 rounded-lg border-2 transition-all ${
                wouldRecommend === true
                  ? 'border-green-500 bg-green-50 text-green-700'
                  : 'border-gray-300 hover:border-gray-400'
              }`}
            >
              <ThumbsUp className="w-5 h-5 mx-auto mb-1" />
              <span className="text-sm font-medium">Yes, I would!</span>
            </button>
            <button
              type="button"
              onClick={() => setWouldRecommend(false)}
              className={`flex-1 py-3 px-4 rounded-lg border-2 transition-all ${
                wouldRecommend === false
                  ? 'border-red-500 bg-red-50 text-red-700'
                  : 'border-gray-300 hover:border-gray-400'
              }`}
            >
              <ThumbsDown className="w-5 h-5 mx-auto mb-1" />
              <span className="text-sm font-medium">No, not really</span>
            </button>
          </div>
        </div>

        {/* Issues */}
        {ratings.overall > 0 && ratings.overall < 4 && (
          <div className="space-y-2">
            <label className="text-sm font-medium text-gray-700">
              What could we improve? (Optional)
            </label>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
              {commonIssues.map((issue) => (
                <button
                  key={issue}
                  type="button"
                  onClick={() => toggleIssue(issue)}
                  className={`py-2 px-3 text-sm rounded-lg border-2 transition-all ${
                    issues.includes(issue)
                      ? 'border-orange-500 bg-orange-50 text-orange-700'
                      : 'border-gray-300 hover:border-gray-400'
                  }`}
                >
                  {issue}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Comments */}
        <div className="space-y-2">
          <label className="text-sm font-medium text-gray-700 flex items-center space-x-2">
            <MessageSquare className="w-4 h-4" />
            <span>Additional Comments (Optional)</span>
          </label>
          <textarea
            value={comments}
            onChange={(e) => setComments(e.target.value)}
            placeholder="Tell us more about your experience..."
            rows={4}
            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          />
        </div>

        {/* Submit Button */}
        <div className="flex space-x-3 pt-4">
          {onSkip && (
            <button
              type="button"
              onClick={onSkip}
              className="px-6 py-3 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
            >
              Skip for Now
            </button>
          )}
          <button
            type="button"
            onClick={handleSubmit}
            disabled={isSubmitting || ratings.overall === 0}
            className="flex-1 flex items-center justify-center space-x-2 px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:bg-gray-300 disabled:cursor-not-allowed"
          >
            {isSubmitting ? (
              <>
                <div className="animate-spin rounded-full h-5 w-5 border-2 border-white border-t-transparent"></div>
                <span>Submitting...</span>
              </>
            ) : (
              <>
                <Send className="w-5 h-5" />
                <span>Submit Feedback</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

// Feedback Dashboard Component
export const FeedbackDashboard: React.FC = () => {
  const [feedbacks, setFeedbacks] = useState<FeedbackSurvey[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [stats, setStats] = useState({
    averageRating: 0,
    totalFeedbacks: 0,
    recommendationRate: 0,
    responsiveTime: 0,
  });

  useEffect(() => {
    loadFeedbacks();
  }, []);

  const loadFeedbacks = async () => {
    try {
      setIsLoading(true);
      const { data, error } = await supabase
        .from('feedback_surveys')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(50);

      if (error) throw error;

      setFeedbacks(data || []);
      calculateStats(data || []);
    } catch (error) {
      console.error('Error loading feedbacks:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const calculateStats = (data: FeedbackSurvey[]) => {
    if (data.length === 0) return;

    const avgRating = data.reduce((sum, f) => sum + f.rating, 0) / data.length;
    const recommended = data.filter(f => f.would_recommend === true).length;
    const recommendRate = (recommended / data.length) * 100;

    setStats({
      averageRating: avgRating,
      totalFeedbacks: data.length,
      recommendationRate: recommendRate,
      responsiveTime: 85, // Mock data
    });
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-gray-900">Customer Feedback</h1>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <div className="flex items-center space-x-3 mb-2">
            <Star className="w-5 h-5 text-yellow-500" />
            <span className="text-sm font-medium text-gray-600">Average Rating</span>
          </div>
          <p className="text-3xl font-bold text-gray-900">
            {stats.averageRating.toFixed(1)}
            <span className="text-lg text-gray-500">/5.0</span>
          </p>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <div className="flex items-center space-x-3 mb-2">
            <MessageSquare className="w-5 h-5 text-blue-500" />
            <span className="text-sm font-medium text-gray-600">Total Feedback</span>
          </div>
          <p className="text-3xl font-bold text-gray-900">{stats.totalFeedbacks}</p>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <div className="flex items-center space-x-3 mb-2">
            <ThumbsUp className="w-5 h-5 text-green-500" />
            <span className="text-sm font-medium text-gray-600">Would Recommend</span>
          </div>
          <p className="text-3xl font-bold text-gray-900">{stats.recommendationRate.toFixed(0)}%</p>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <div className="flex items-center space-x-3 mb-2">
            <TrendingUp className="w-5 h-5 text-purple-500" />
            <span className="text-sm font-medium text-gray-600">Response Rate</span>
          </div>
          <p className="text-3xl font-bold text-gray-900">{stats.responsiveTime}%</p>
        </div>
      </div>

      {/* Recent Feedback */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <h2 className="text-lg font-bold text-gray-900 mb-4">Recent Feedback</h2>
        <div className="space-y-4">
          {feedbacks.slice(0, 10).map((feedback) => (
            <div key={feedback.id} className="border-b border-gray-200 pb-4 last:border-0">
              <div className="flex items-start justify-between mb-2">
                <div className="flex items-center space-x-2">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <Star
                      key={star}
                      className={`w-4 h-4 ${
                        star <= feedback.rating
                          ? 'fill-yellow-400 text-yellow-400'
                          : 'text-gray-300'
                      }`}
                    />
                  ))}
                  <span className="text-sm text-gray-600">Trip #{feedback.trip_id.slice(0, 8)}</span>
                </div>
                <span className="text-xs text-gray-500">
                  {feedback.survey_completed_at
                    ? new Date(feedback.survey_completed_at).toLocaleDateString()
                    : 'Pending'}
                </span>
              </div>
              {feedback.comments && (
                <p className="text-sm text-gray-700 mt-2">{feedback.comments}</p>
              )}
              {feedback.issues_reported && feedback.issues_reported.length > 0 && (
                <div className="flex flex-wrap gap-2 mt-2">
                  {feedback.issues_reported.map((issue, idx) => (
                    <span
                      key={idx}
                      className="px-2 py-1 bg-orange-100 text-orange-700 text-xs rounded-full"
                    >
                      {issue}
                    </span>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
