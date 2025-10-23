"use client";

import React, { useState, useEffect } from "react";
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

  useEffect(() => {
    fetchDefensePeriod();
  }, []);

  const fetchDefensePeriod = async () => {
    try {
      const response = await fetch("/api/admin/defense-period", { method: "GET" });
      const data = await response.json();

      if (response.ok && data) {
        setCurrentPeriod(data as DefensePeriod);
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

    const startDate = parseDate(formData.period_start);
    const endDate = parseDate(formData.period_end);

    if (endDate < startDate) {
      setMessage({ type: 'error', text: 'End date must be on or after start date' });
      return;
    }

    setIsLoading(true);
    setMessage(null);

    try {
      const response = await fetch("/api/admin/defense-period", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          id: currentPeriod?.id,
          period_start: formData.period_start,
          period_end: formData.period_end
        })
      });

      const result = await response.json();

      if (!response.ok) {
        console.error('Error saving defense period:', result?.error);
        setMessage({ 
          type: 'error', 
          text: `Failed to save defense period: ${result?.error || 'Unknown error'}. Check console for details.` 
        });
        return;
      }

      setMessage({ 
        type: 'success', 
        text: `Defense period ${currentPeriod ? 'updated' : 'set'} successfully!` 
      });
      
      setCurrentPeriod(result as DefensePeriod);
      if (onPeriodUpdated) {
        onPeriodUpdated(result as DefensePeriod);
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
    if (message) {
      setMessage(null);
    }
  };

  const parseDate = (value: string) => {
    const [year, month, day] = value.split("-").map(Number);
    return new Date(year, month - 1, day);
  };

  const formatDisplayDate = (dateString: string) => {
    const date = parseDate(dateString);
    return date.toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  const calculateDuration = (start: string, end: string) => {
    const startDate = parseDate(start);
    const endDate = parseDate(end);
    const msPerDay = 1000 * 60 * 60 * 24;
    return Math.round((endDate.getTime() - startDate.getTime()) / msPerDay) + 1;
  };

  return (
    <div className="max-w-xl mx-auto space-y-10">
      <div className="space-y-4">
        <div className="text-center space-y-2">
          <h2 className="text-2xl font-semibold text-neutral-900 dark:text-neutral-100">
            Set Defense Period
          </h2>
          <p className="text-sm text-neutral-500 dark:text-neutral-400">
            Configure the oral defense presentation dates
          </p>
        </div>

        {loadingPeriod ? (
          <div className="text-center py-12">
            <p className="text-neutral-500 dark:text-neutral-400">Loading current period...</p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-medium uppercase tracking-wide text-neutral-500 dark:text-neutral-400 mb-2">
                  Start Date
                </label>
                <input
                  type="date"
                  name="period_start"
                  value={formData.period_start}
                  onChange={handleInputChange}
                  className="w-full px-4 py-3 rounded-md border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-900 text-neutral-900 dark:text-neutral-100 focus:outline-none focus:ring-1 focus:ring-neutral-500"
                  disabled={isLoading}
                />
              </div>
              <div>
                <label className="block text-xs font-medium uppercase tracking-wide text-neutral-500 dark:text-neutral-400 mb-2">
                  End Date
                </label>
                <input
                  type="date"
                  name="period_end"
                  value={formData.period_end}
                  onChange={handleInputChange}
                  className="w-full px-4 py-3 rounded-md border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-900 text-neutral-900 dark:text-neutral-100 focus:outline-none focus:ring-1 focus:ring-neutral-500"
                  disabled={isLoading}
                />
              </div>
            </div>

            {message && (
              <div className={`rounded-md border px-4 py-3 text-sm ${
                message.type === 'success'
                  ? 'border-emerald-300/60 text-emerald-600 dark:border-emerald-500/40 dark:text-emerald-300'
                  : 'border-rose-300/60 text-rose-600 dark:border-rose-500/40 dark:text-rose-300'
              }`}>
                {message.text}
              </div>
            )}

            <div className="flex justify-center">
              <button
                type="submit"
                disabled={isLoading}
                className="inline-flex items-center justify-center px-4 py-2.5 rounded-md bg-neutral-900 hover:bg-neutral-800 dark:bg-neutral-100 dark:hover:bg-neutral-200 text-white dark:text-neutral-900 text-sm font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isLoading ? 'Saving…' : currentPeriod ? 'Update Period' : 'Set Period'}
              </button>
            </div>
          </form>
        )}
      </div>

      {currentPeriod && !loadingPeriod && (
        <div className="rounded-md border border-neutral-200/80 dark:border-neutral-800/60 p-6 bg-white/50 dark:bg-neutral-900/40">
          <h3 className="text-sm font-semibold text-neutral-700 dark:text-neutral-300 uppercase tracking-wide mb-4">
            Current Defense Period
          </h3>
          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <p className="text-xs text-neutral-500 dark:text-neutral-400 uppercase tracking-wide">Start Date</p>
              <p className="text-sm font-medium text-neutral-900 dark:text-neutral-100">
                {formatDisplayDate(currentPeriod.period_start)}
              </p>
            </div>
            <div>
              <p className="text-xs text-neutral-500 dark:text-neutral-400 uppercase tracking-wide">End Date</p>
              <p className="text-sm font-medium text-neutral-900 dark:text-neutral-100">
                {formatDisplayDate(currentPeriod.period_end)}
              </p>
            </div>
            <div>
              <p className="text-xs text-neutral-500 dark:text-neutral-400 uppercase tracking-wide">Duration</p>
              <p className="text-sm font-medium text-neutral-900 dark:text-neutral-100">
                {calculateDuration(currentPeriod.period_start, currentPeriod.period_end)} days
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
