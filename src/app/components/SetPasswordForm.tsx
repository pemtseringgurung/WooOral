"use client";

import React, { useState, useEffect } from "react";
import { getSupabaseClient } from "@/lib/supabase";
import type { Password } from "@/types/index";
import { Eye, EyeOff, Lock, User, GraduationCap } from "lucide-react";

interface SetPasswordFormProps {
  onPasswordUpdated?: (passwords: Password) => void;
}

export default function SetPasswordForm({ onPasswordUpdated }: SetPasswordFormProps) {
  const [formData, setFormData] = useState({
    student_password: "",
    professor_password: ""
  });
  const [isLoading, setIsLoading] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [currentPasswords, setCurrentPasswords] = useState<Password | null>(null);
  const [loadingPasswords, setLoadingPasswords] = useState(true);
  const [showStudentPassword, setShowStudentPassword] = useState(false);
  const [showProfessorPassword, setShowProfessorPassword] = useState(false);

  // Fetch current passwords on component mount
  useEffect(() => {
    fetchPasswords();
  }, []);

  const fetchPasswords = async () => {
    try {
      const supabase = getSupabaseClient();
      const { data, error } = await supabase
        .from('passwords')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(1)
        .single();

      if (error && error.code !== 'PGRST116') { // PGRST116 = no rows found
        console.error('Error fetching passwords:', error);
      } else if (data) {
        setCurrentPasswords(data);
        // Don't populate form with existing passwords for security
        setFormData({
          student_password: "",
          professor_password: ""
        });
      }
    } catch (error) {
      console.error('Unexpected error fetching passwords:', error);
    } finally {
      setLoadingPasswords(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.student_password || !formData.professor_password) {
      setMessage({ type: 'error', text: 'Please enter both student and professor passwords' });
      return;
    }

    // Password validation
    if (formData.student_password.length < 6) {
      setMessage({ type: 'error', text: 'Student password must be at least 6 characters long' });
      return;
    }

    if (formData.professor_password.length < 6) {
      setMessage({ type: 'error', text: 'Professor password must be at least 6 characters long' });
      return;
    }

    if (formData.student_password === formData.professor_password) {
      setMessage({ type: 'error', text: 'Student and professor passwords must be different' });
      return;
    }

    setIsLoading(true);
    setMessage(null);

    try {
      const supabase = getSupabaseClient();
      
      let data, error;
      
      if (currentPasswords) {
        // Update existing passwords
        ({ data, error } = await supabase
          .from('passwords')
          .update({
            student_password: formData.student_password,
            professor_password: formData.professor_password
          })
          .eq('id', currentPasswords.id)
          .select()
          .single());
      } else {
        // Create new passwords
        ({ data, error } = await supabase
          .from('passwords')
          .insert([{
            student_password: formData.student_password,
            professor_password: formData.professor_password
          }])
          .select()
          .single());
      }

      if (error) {
        console.error('Error saving passwords:', error);
        setMessage({ type: 'error', text: 'Failed to save passwords. Please try again.' });
        return;
      }

      setMessage({ 
        type: 'success', 
        text: `Passwords ${currentPasswords ? 'updated' : 'set'} successfully!` 
      });
      
      // Clear form after successful submission
      setFormData({
        student_password: "",
        professor_password: ""
      });
      
      if (data) {
        setCurrentPasswords(data as Password);
        if (onPasswordUpdated) {
          onPasswordUpdated(data as Password);
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
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  return (
    <div className="space-y-8">
      <div className="max-w-md mx-auto bg-white dark:bg-neutral-900 rounded-2xl shadow-lg p-8">
        <div className="text-center mb-8">
          <div className="w-16 h-16 bg-yellow-100 dark:bg-yellow-900/20 rounded-full flex items-center justify-center mx-auto mb-4">
            <Lock className="w-8 h-8 text-yellow-600 dark:text-yellow-400" />
          </div>
          <h2 className="text-2xl font-bold text-neutral-800 dark:text-neutral-200">
            Set Passwords
          </h2>
          <p className="text-neutral-600 dark:text-neutral-400 mt-2">
            Configure access passwords for students and professors
          </p>
        </div>

        {loadingPasswords ? (
          <div className="text-center py-8">
            <div className="text-neutral-500 dark:text-neutral-400">Loading current passwords...</div>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Student Password */}
            <div>
              <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-2">
                <div className="flex items-center gap-2">
                  <GraduationCap className="w-4 h-4" />
                  Student Password
                </div>
              </label>
              <div className="relative">
                <input
                  type={showStudentPassword ? "text" : "password"}
                  name="student_password"
                  value={formData.student_password}
                  onChange={handleInputChange}
                  placeholder="Enter student password (min. 6 characters)"
                  className="w-full px-4 py-3 pr-12 border border-neutral-300 dark:border-neutral-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-neutral-800 text-neutral-900 dark:text-neutral-100 placeholder-neutral-500 dark:placeholder-neutral-400"
                  disabled={isLoading}
                />
                <button
                  type="button"
                  onClick={() => setShowStudentPassword(!showStudentPassword)}
                  className="absolute inset-y-0 right-0 pr-3 flex items-center text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-300"
                  disabled={isLoading}
                >
                  {showStudentPassword ? (
                    <EyeOff className="w-5 h-5" />
                  ) : (
                    <Eye className="w-5 h-5" />
                  )}
                </button>
              </div>
            </div>

            {/* Professor Password */}
            <div>
              <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-2">
                <div className="flex items-center gap-2">
                  <User className="w-4 h-4" />
                  Professor Password
                </div>
              </label>
              <div className="relative">
                <input
                  type={showProfessorPassword ? "text" : "password"}
                  name="professor_password"
                  value={formData.professor_password}
                  onChange={handleInputChange}
                  placeholder="Enter professor password (min. 6 characters)"
                  className="w-full px-4 py-3 pr-12 border border-neutral-300 dark:border-neutral-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-neutral-800 text-neutral-900 dark:text-neutral-100 placeholder-neutral-500 dark:placeholder-neutral-400"
                  disabled={isLoading}
                />
                <button
                  type="button"
                  onClick={() => setShowProfessorPassword(!showProfessorPassword)}
                  className="absolute inset-y-0 right-0 pr-3 flex items-center text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-300"
                  disabled={isLoading}
                >
                  {showProfessorPassword ? (
                    <EyeOff className="w-5 h-5" />
                  ) : (
                    <Eye className="w-5 h-5" />
                  )}
                </button>
              </div>
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
              {isLoading ? 'Saving...' : (currentPasswords ? 'Update Passwords' : 'Set Passwords')}
            </button>
          </form>
        )}
      </div>

      {/* Current Status Display */}
      {currentPasswords && !loadingPasswords && (
        <div className="max-w-md mx-auto bg-white dark:bg-neutral-900 rounded-2xl shadow-lg p-6">
          <h3 className="text-lg font-semibold text-neutral-800 dark:text-neutral-200 mb-4">
            Password Status
          </h3>
          <div className="space-y-3">
            <div className="flex justify-between items-center">
              <span className="text-neutral-600 dark:text-neutral-400">Student Password:</span>
              <span className="font-medium text-green-600 dark:text-green-400">
                ✓ Set
              </span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-neutral-600 dark:text-neutral-400">Professor Password:</span>
              <span className="font-medium text-green-600 dark:text-green-400">
                ✓ Set
              </span>
            </div>
            <div className="flex justify-between items-center pt-2 border-t border-neutral-200 dark:border-neutral-700">
              <span className="text-neutral-600 dark:text-neutral-400">Last Updated:</span>
              <span className="font-medium text-neutral-900 dark:text-neutral-100 text-sm">
                {formatDisplayDate(currentPasswords.created_at)}
              </span>
            </div>
          </div>
          
          <div className="mt-4 p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
            <div className="flex items-start gap-2">
              <div className="w-2 h-2 bg-blue-500 rounded-full mt-2 flex-shrink-0"></div>
              <p className="text-sm text-blue-700 dark:text-blue-300">
                <strong>Security Note:</strong> Passwords are stored securely and cannot be viewed once set. 
                You can only update them with new values.
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
