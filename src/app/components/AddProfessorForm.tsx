"use client";

import React, { useState, useEffect } from "react";
import { getSupabaseClient } from "@/lib/supabase";
import type { Professor } from "@/types/index";

interface AddProfessorFormProps {
  onProfessorAdded?: (professor: Professor) => void;
}

export default function AddProfessorForm({ onProfessorAdded }: AddProfessorFormProps) {
  const [formData, setFormData] = useState({
    name: "",
    email: ""
  });
  const [isLoading, setIsLoading] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [professors, setProfessors] = useState<Professor[]>([]);
  const [loadingProfessors, setLoadingProfessors] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [deletingProfessorId, setDeletingProfessorId] = useState<string | null>(null);

  // Fetch professors on component mount
  useEffect(() => {
    fetchProfessors();
  }, []);

  const fetchProfessors = async () => {
    try {
      const supabase = getSupabaseClient();
      const { data, error } = await supabase
        .from('professors')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching professors:', error);
      } else {
        setProfessors(data || []);
      }
    } catch (error) {
      console.error('Unexpected error fetching professors:', error);
    } finally {
      setLoadingProfessors(false);
    }
  };

  const deleteProfessor = async (professorId: string) => {
    setDeletingProfessorId(professorId);
    try {
      const supabase = getSupabaseClient();
      const { error } = await supabase
        .from('professors')
        .delete()
        .eq('id', professorId);

      if (error) {
        console.error('Error deleting professor:', error);
        setMessage({ type: 'error', text: 'Failed to delete professor. Please try again.' });
      } else {
        setProfessors(prev => prev.filter(prof => prof.id !== professorId));
        setMessage({ type: 'success', text: 'Professor removed successfully!' });
      }
    } catch (error) {
      console.error('Unexpected error deleting professor:', error);
      setMessage({ type: 'error', text: 'An unexpected error occurred. Please try again.' });
    } finally {
      setDeletingProfessorId(null);
    }
  };

  // Filter professors based on search query
  const filteredProfessors = professors.filter(professor =>
    professor.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    professor.email.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.name.trim() || !formData.email.trim()) {
      setMessage({ type: 'error', text: 'Please fill in all fields' });
      return;
    }

    // Basic email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(formData.email)) {
      setMessage({ type: 'error', text: 'Please enter a valid email address' });
      return;
    }

    setIsLoading(true);
    setMessage(null);

    try {
      const supabase = getSupabaseClient();
      
      const { data, error } = await supabase
        .from('professors')
        .insert([
          {
            name: formData.name.trim(),
            email: formData.email.trim().toLowerCase()
          }
        ])
        .select()
        .single();

      if (error) {
        console.error('Error adding professor:', error);
        if (error.code === '23505') {
          setMessage({ type: 'error', text: 'A professor with this email already exists' });
        } else {
          setMessage({ type: 'error', text: 'Failed to add professor. Please try again.' });
        }
        return;
      }

      setMessage({ type: 'success', text: 'Professor added successfully!' });
      setFormData({ name: "", email: "" });
      
      // Add the new professor to the list
      if (data) {
        setProfessors(prev => [data as Professor, ...prev]);
      }
      
      if (onProfessorAdded && data) {
        onProfessorAdded(data as Professor);
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

  return (
    <div className="space-y-8">
      <div className="max-w-md mx-auto bg-white dark:bg-neutral-900 rounded-2xl shadow-lg p-8">
        <div className="text-center mb-8">
          <h2 className="text-2xl font-bold text-neutral-800 dark:text-neutral-200">
            Add Professor
          </h2>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-2">
              Full Name
            </label>
            <input
              type="text"
              name="name"
              value={formData.name}
              onChange={handleInputChange}
              placeholder="Enter professor's full name"
              className="w-full px-4 py-3 border border-neutral-300 dark:border-neutral-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-neutral-800 text-neutral-900 dark:text-neutral-100 placeholder-neutral-500 dark:placeholder-neutral-400"
              disabled={isLoading}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-2">
              Email Address
            </label>
            <input
              type="email"
              name="email"
              value={formData.email}
              onChange={handleInputChange}
              placeholder="Enter professor's email address"
              className="w-full px-4 py-3 border border-neutral-300 dark:border-neutral-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-neutral-800 text-neutral-900 dark:text-neutral-100 placeholder-neutral-500 dark:placeholder-neutral-400"
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
            {isLoading ? 'Adding Professor...' : 'Submit'}
          </button>
        </form>
      </div>

      {/* Professors List */}
      <div className="max-w-4xl mx-auto bg-white dark:bg-neutral-900 rounded-2xl shadow-lg">
        <div className="p-6 border-b border-neutral-200 dark:border-neutral-700">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-3xl font-bold text-neutral-900 dark:text-neutral-100">
                Added Professors
              </h3>
              <p className="text-neutral-500 dark:text-neutral-400 text-sm mt-1">
                {professors.length} professor{professors.length !== 1 ? 's' : ''}
              </p>
            </div>
            
            {/* Search Bar */}
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <svg className="h-4 w-4 text-neutral-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
              </div>
              <input
                type="text"
                placeholder="Search"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="block w-64 pl-10 pr-3 py-2 border border-neutral-300 dark:border-neutral-600 rounded-lg bg-neutral-50 dark:bg-neutral-800 text-neutral-900 dark:text-neutral-100 placeholder-neutral-500 dark:placeholder-neutral-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
              />
            </div>
          </div>
        </div>

        <div className="p-6">
          {loadingProfessors ? (
            <div className="text-center py-8">
              <div className="text-neutral-500 dark:text-neutral-400">Loading professors...</div>
            </div>
          ) : filteredProfessors.length === 0 ? (
            <div className="text-center py-8">
              <div className="text-neutral-500 dark:text-neutral-400">
                {searchQuery ? 'No professors found matching your search' : 'No professors added yet'}
              </div>
            </div>
          ) : (
            <div className="space-y-1">
              {filteredProfessors.map((professor) => (
                <div
                  key={professor.id}
                  className="flex items-center justify-between p-4 hover:bg-neutral-50 dark:hover:bg-neutral-800 rounded-lg transition-colors"
                >
                  <div className="flex items-center space-x-4">
                    <div className="w-10 h-10 bg-neutral-200 dark:bg-neutral-700 rounded-full flex items-center justify-center">
                      <span className="text-sm font-medium text-neutral-600 dark:text-neutral-300">
                        {professor.name.charAt(0).toUpperCase()}
                      </span>
                    </div>
                    <div>
                      <h4 className="font-medium text-neutral-900 dark:text-neutral-100">
                        {professor.name}
                      </h4>
                      <p className="text-sm text-neutral-500 dark:text-neutral-400">
                        {professor.email}
                      </p>
                    </div>
                  </div>
                  
                  <button
                    onClick={() => deleteProfessor(professor.id)}
                    disabled={deletingProfessorId === professor.id}
                    className="p-2 bg-red-500 hover:bg-red-600 text-white rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    title="Remove professor"
                  >
                    {deletingProfessorId === professor.id ? (
                      <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                    ) : (
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                      </svg>
                    )}
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
