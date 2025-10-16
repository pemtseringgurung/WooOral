"use client";

import React, { useState, useEffect } from "react";
import { Eye, EyeOff } from "lucide-react";
import type { Password } from "@/types/index";

interface SetPasswordFormProps {
  onPasswordUpdated?: (passwords: Password) => void;
}

export default function SetPasswordForm({ onPasswordUpdated }: SetPasswordFormProps) {
  const [formData, setFormData] = useState({
    student_password: "",
    professor_password: "",
    admin_password: ""
  });
  const [isLoading, setIsLoading] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [currentPasswords, setCurrentPasswords] = useState<Password | null>(null);
  const [loadingPasswords, setLoadingPasswords] = useState(true);
  const [showStudentPassword, setShowStudentPassword] = useState(false);
  const [showProfessorPassword, setShowProfessorPassword] = useState(false);
  const [showAdminPassword, setShowAdminPassword] = useState(false);

  useEffect(() => {
    fetchPasswords();
  }, []);

  const fetchPasswords = async () => {
    try {
      const response = await fetch("/api/admin/passwords", { method: "GET" });
      const data = await response.json();

      if (response.ok && data) {
        setCurrentPasswords(data as Password);
        setFormData({
          student_password: "",
          professor_password: "",
          admin_password: ""
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
    
    if (!formData.student_password || !formData.professor_password || !formData.admin_password) {
      setMessage({ type: 'error', text: 'Please enter student, professor, and admin passwords' });
      return;
    }

    if (formData.student_password.length < 6) {
      setMessage({ type: 'error', text: 'Student password must be at least 6 characters long' });
      return;
    }

    if (formData.professor_password.length < 6) {
      setMessage({ type: 'error', text: 'Professor password must be at least 6 characters long' });
      return;
    }

    if (formData.admin_password.length < 8) {
      setMessage({ type: 'error', text: 'Admin password must be at least 8 characters long' });
      return;
    }

    if (formData.student_password === formData.professor_password) {
      setMessage({ type: 'error', text: 'Student and professor passwords must be different' });
      return;
    }

    if ([formData.student_password, formData.professor_password].includes(formData.admin_password)) {
      setMessage({ type: 'error', text: 'Admin password must be unique and different from student/professor passwords' });
      return;
    }

    setIsLoading(true);
    setMessage(null);

    try {
      const response = await fetch("/api/admin/passwords", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          id: currentPasswords?.id,
          student_password: formData.student_password,
          professor_password: formData.professor_password,
          admin_password: formData.admin_password
        })
      });

      const result = await response.json();

      if (!response.ok) {
        console.error("Error saving passwords:", result?.error);
        setMessage({ type: "error", text: result?.error ?? "Failed to save passwords. Please try again." });
        return;
      }

      setMessage({ 
        type: 'success', 
        text: `Passwords ${currentPasswords ? 'updated' : 'set'} successfully!` 
      });
      
      setFormData({
        student_password: "",
        professor_password: "",
        admin_password: ""
      });
      
      setCurrentPasswords(result as Password);
      if (onPasswordUpdated) {
        onPasswordUpdated(result as Password);
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
    <div className="max-w-xl mx-auto space-y-10">
      <div className="space-y-4">
        <div className="text-center space-y-2">
          <h2 className="text-2xl font-semibold text-neutral-900 dark:text-neutral-100">
            Set Passwords
          </h2>
          <p className="text-sm text-neutral-500 dark:text-neutral-400">
            Configure access passwords for students, professors, and administrators
          </p>
        </div>

        {loadingPasswords ? (
          <div className="text-center py-12">
            <p className="text-neutral-500 dark:text-neutral-400">Loading current passwords...</p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-medium uppercase tracking-wide text-neutral-500 dark:text-neutral-400 mb-2">
                  Student Password
                </label>
                <div className="relative">
                  <input
                    type={showStudentPassword ? "text" : "password"}
                    name="student_password"
                    value={formData.student_password}
                    onChange={handleInputChange}
                    placeholder="Enter student password (min. 6 characters)"
                    className="w-full px-4 py-3 pr-12 rounded-md border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-900 text-neutral-900 dark:text-neutral-100 placeholder-neutral-400 dark:placeholder-neutral-500 focus:outline-none focus:ring-1 focus:ring-neutral-500"
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

              <div>
                <label className="block text-xs font-medium uppercase tracking-wide text-neutral-500 dark:text-neutral-400 mb-2">
                  Professor Password
                </label>
                <div className="relative">
                  <input
                    type={showProfessorPassword ? "text" : "password"}
                    name="professor_password"
                    value={formData.professor_password}
                    onChange={handleInputChange}
                    placeholder="Enter professor password (min. 6 characters)"
                    className="w-full px-4 py-3 pr-12 rounded-md border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-900 text-neutral-900 dark:text-neutral-100 placeholder-neutral-400 dark:placeholder-neutral-500 focus:outline-none focus:ring-1 focus:ring-neutral-500"
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

              <div>
                <label className="block text-xs font-medium uppercase tracking-wide text-neutral-500 dark:text-neutral-400 mb-2">
                  Admin Password
                </label>
                <div className="relative">
                  <input
                    type={showAdminPassword ? "text" : "password"}
                    name="admin_password"
                    value={formData.admin_password}
                    onChange={handleInputChange}
                    placeholder="Enter admin password (min. 8 characters)"
                    className="w-full px-4 py-3 pr-12 rounded-md border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-900 text-neutral-900 dark:text-neutral-100 placeholder-neutral-400 dark:placeholder-neutral-500 focus:outline-none focus:ring-1 focus:ring-neutral-500"
                    disabled={isLoading}
                  />
                  <button
                    type="button"
                    onClick={() => setShowAdminPassword(!showAdminPassword)}
                    className="absolute inset-y-0 right-0 pr-3 flex items-center text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-300"
                    disabled={isLoading}
                  >
                    {showAdminPassword ? (
                      <EyeOff className="w-5 h-5" />
                    ) : (
                      <Eye className="w-5 h-5" />
                    )}
                  </button>
                </div>
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
                {isLoading ? 'Saving…' : (currentPasswords ? 'Update Passwords' : 'Set Passwords')}
              </button>
            </div>
          </form>
        )}
      </div>

      {currentPasswords && !loadingPasswords && (
        <div className="rounded-md border border-neutral-200/80 dark:border-neutral-800/60 p-6 bg-white/50 dark:bg-neutral-900/40">
          <h3 className="text-sm font-semibold text-neutral-700 dark:text-neutral-300 uppercase tracking-wide mb-4">
            Password Status
          </h3>
          <div className="grid gap-4 sm:grid-cols-3">
            {[
              { label: 'Student', value: currentPasswords.student_password },
              { label: 'Professor', value: currentPasswords.professor_password },
              { label: 'Admin', value: currentPasswords.admin_password }
            ].map((item) => (
              <div key={item.label} className="space-y-1">
                <p className="text-xs text-neutral-500 dark:text-neutral-400 uppercase tracking-wide">
                  {item.label}
                </p>
                <p className="text-sm font-medium text-emerald-600 dark:text-emerald-300">✓ Set</p>
              </div>
            ))}
          </div>
          <div className="mt-4 pt-4 border-t border-neutral-200 dark:border-neutral-800 text-sm text-neutral-600 dark:text-neutral-400">
            Last updated: {formatDisplayDate(currentPasswords.created_at)}
          </div>
        </div>
      )}
    </div>
  );
}
