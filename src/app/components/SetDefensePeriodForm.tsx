"use client";

import React, { useState, useEffect } from "react";
import { getSupabaseClient } from "@/lib/supabase";
import type { DefensePeriod } from "@/types/index";

interface SetDefensePeriodFormProps {
  onPeriodUpdated?: (period: DefensePeriod) => void;
}

export default function SetDefensePeriodForm({ onPeriodUpdated }: SetDefensePeriodFormProps) {
  const [formData, setFormData] = useState({
    period_start: "",
    period_end: ""
  });
  const [isLoading, setIsLoading] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [currentPeriod, setCurrentPeriod] = useState<DefensePeriod | null>(null);
  const [loadingPeriod, setLoadingPeriod] = useState(true);

  // Fetch current defense period on component mount
  useEffect(() => {
    fetchDefensePeriod();
  }, []);

  const fetchDefensePeriod = async () => {
    try {
      const supabase = getSupabaseClient();
      const { data, error } = await supabase
        .from('oral_time_period')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(1)
        .single();

      if (error && error.code !== 'PGRST116') { // PGRST116 = no rows found
        console.error('Error fetching defense period:', error);
      } else if (data) {
        setCurrentPeriod(data);
        // Format dates for input fields (YYYY-MM-DD)
        setFormData({
          period_start: data.period_start,
          period_end: data.period_end
        });
      }
    } catch (error) {
      console.error('Unexpected error fetching defense period:', error);
    } finally {
      setLoadingPeriod(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.period_start || !formData.period_end) {
      setMessage({ type: 'error', text: 'Please select both start and end dates' });
      return;
    }

    // Validate that end date is after start date
    if (new Date(formData.period_end) <= new Date(formData.period_start)) {
      setMessage({ type: 'error', text: 'End date must be after start date' });
      return;
    }

    setIsLoading(true);
    setMessage(null);

    try {
      const supabase = getSupabaseClient();
      
      let data, error;
      
      if (currentPeriod) {
        // Update existing period
        ({ data, error } = await supabase
          .from('oral_time_period')
          .update({
            period_start: formData.period_start,
            period_end: formData.period_end
          })
          .eq('id', currentPeriod.id)
          .select()
          .single());
      } else {
        // Create new period
        ({ data, error } = await supabase
          .from('oral_time_period')
          .insert([{
            period_start: formData.period_start,
            period_end: formData.period_end
          }])
          .select()
          .single());
      }

      if (error) {
        console.error('Error saving defense period:', error);
        setMessage({ 
          type: 'error', 
          text: `Failed to save defense period: ${error.message || 'Unknown error'}. Check console for details.` 
        });
        return;
      }

      setMessage({ 
        type: 'success', 
        text: `Defense period ${currentPeriod ? 'updated' : 'set'} successfully!` 
      });
      
      if (data) {
        setCurrentPeriod(data as DefensePeriod);
        if (onPeriodUpdated) {
          onPeriodUpdated(data as DefensePeriod);
        }
      }

    } catch (error) {
      console.error('Unexpected error:', error);
      setMessage({ type: 'error', text: 'An unexpected error occurred. Please try again.' });
    } finally {
      setIsLoading(false);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
    
    // Clear message when user starts typing
    if (message) {
      setMessage(null);
    }
  };

  const formatDisplayDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  return (
    <div className="space-y-8">
      <div className="max-w-md mx-auto bg-white dark:bg-neutral-900 rounded-2xl shadow-lg p-8">
        <div className="text-center mb-8">
          <h2 className="text-2xl font-bold text-neutral-800 dark:text-neutral-200">
            Set Defense Period
          </h2>
          <p className="text-neutral-600 dark:text-neutral-400 mt-2">
            Configure the oral defense presentation dates
          </p>
        </div>

        {loadingPeriod ? (
          <div className="text-center py-8">
            <div className="text-neutral-500 dark:text-neutral-400">Loading current period...</div>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-2">
                Start Date
              </label>
            <input
              type="date"
              name="period_start"
              value={formData.period_start}
              onChange={handleInputChange}
              className="w-full px-4 py-3 border border-neutral-300 dark:border-neutral-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-neutral-800 text-neutral-900 dark:text-neutral-100"
              disabled={isLoading}
            />
            </div>

            <div>
              <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-2">
                End Date
              </label>
            <input
              type="date"
              name="period_end"
              value={formData.period_end}
              onChange={handleInputChange}
              className="w-full px-4 py-3 border border-neutral-300 dark:border-neutral-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-neutral-800 text-neutral-900 dark:text-neutral-100"
              disabled={isLoading}
            />
            </div>

            {message && (
              <div className={`p-3 rounded-lg text-sm ${
                message.type === 'success' 
                  ? 'bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-300' 
                  : 'bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-300'
              }`}>
                {message.text}
              </div>
            )}

            <button
              type="submit"
              disabled={isLoading}
              className="w-full bg-yellow-400 hover:bg-yellow-500 disabled:bg-yellow-300 text-black font-medium py-3 px-4 rounded-lg transition-all duration-200 disabled:cursor-not-allowed shadow-md hover:shadow-lg transform hover:-translate-y-0.5 disabled:transform-none disabled:shadow-md"
            >
              {isLoading ? 'Saving...' : (currentPeriod ? 'Update Period' : 'Set Period')}
            </button>
          </form>
        )}
      </div>

      {/* Current Period Display */}
      {currentPeriod && !loadingPeriod && (
        <div className="max-w-md mx-auto bg-white dark:bg-neutral-900 rounded-2xl shadow-lg p-6">
          <h3 className="text-lg font-semibold text-neutral-800 dark:text-neutral-200 mb-4">
            Current Defense Period
          </h3>
          <div className="space-y-3">
            <div className="flex justify-between items-center">
              <span className="text-neutral-600 dark:text-neutral-400">Start Date:</span>
              <span className="font-medium text-neutral-900 dark:text-neutral-100">
                {formatDisplayDate(currentPeriod.period_start)}
              </span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-neutral-600 dark:text-neutral-400">End Date:</span>
              <span className="font-medium text-neutral-900 dark:text-neutral-100">
                {formatDisplayDate(currentPeriod.period_end)}
              </span>
            </div>
            <div className="flex justify-between items-center pt-2 border-t border-neutral-200 dark:border-neutral-700">
              <span className="text-neutral-600 dark:text-neutral-400">Duration:</span>
              <span className="font-medium text-neutral-900 dark:text-neutral-100">
                {Math.ceil((new Date(currentPeriod.period_end).getTime() - new Date(currentPeriod.period_start).getTime()) / (1000 * 60 * 60 * 24))} days
              </span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
