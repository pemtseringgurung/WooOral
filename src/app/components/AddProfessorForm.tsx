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
  const [professorPendingDelete, setProfessorPendingDelete] = useState<Professor | null>(null);

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

  const confirmDeleteProfessor = (professor: Professor) => {
    setProfessorPendingDelete(professor);
  };

  const deleteProfessor = async () => {
    const professor = professorPendingDelete;
    if (!professor) return;
    setDeletingProfessorId(professor.id);
    try {
      const supabase = getSupabaseClient();
      const { error } = await supabase
        .from('professors')
        .delete()
        .eq('id', professor.id);

      if (error) {
        console.error('Error deleting professor:', error);
        setMessage({ type: 'error', text: 'Failed to delete professor. Please try again.' });
      } else {
        setProfessors(prev => prev.filter(prof => prof.id !== professor.id));
        setMessage({ type: 'success', text: 'Professor removed successfully!' });
      }
    } catch (error) {
      console.error('Unexpected error deleting professor:', error);
      setMessage({ type: 'error', text: 'An unexpected error occurred. Please try again.' });
    } finally {
      setDeletingProfessorId(null);
      setProfessorPendingDelete(null);
    }
  };

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
      
      if (data) {
        setProfessors(prev => [data as Professor, ...prev]);
        onProfessorAdded?.(data as Professor);
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

  return (
    <div className="space-y-12">
      <div className="max-w-xl mx-auto space-y-6">
        <div className="text-center space-y-2">
          <h2 className="text-2xl font-semibold text-neutral-900 dark:text-neutral-100">
            Add Professor
          </h2>
          <p className="text-sm text-neutral-500 dark:text-neutral-400">
            Invite faculty to manage oral defenses
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5">
          <div className="space-y-4">
            <div>
              <label className="block text-xs font-medium uppercase tracking-wide text-neutral-500 dark:text-neutral-400 mb-2">
                Full Name
              </label>
              <input
                type="text"
                name="name"
                value={formData.name}
                onChange={handleInputChange}
                placeholder="Enter professor's full name"
                className="w-full px-4 py-3 rounded-md border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-900 text-neutral-900 dark:text-neutral-100 placeholder-neutral-400 dark:placeholder-neutral-500 focus:outline-none focus:ring-1 focus:ring-neutral-500"
                disabled={isLoading}
              />
            </div>

            <div>
              <label className="block text-xs font-medium uppercase tracking-wide text-neutral-500 dark:text-neutral-400 mb-2">
                Email Address
              </label>
              <input
                type="email"
                name="email"
                value={formData.email}
                onChange={handleInputChange}
                placeholder="name@wooster.edu"
                className="w-full px-4 py-3 rounded-md border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-900 text-neutral-900 dark:text-neutral-100 placeholder-neutral-400 dark:placeholder-neutral-500 focus:outline-none focus:ring-1 focus:ring-neutral-500"
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
              {isLoading ? 'Adding…' : 'Submit'}
            </button>
          </div>
        </form>
      </div>

      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
          <div>
            <h3 className="text-lg font-semibold text-neutral-900 dark:text-neutral-100">
              Added Professors
            </h3>
            <p className="text-sm text-neutral-500 dark:text-neutral-400">
              {professors.length} professor{professors.length !== 1 ? 's' : ''}
            </p>
          </div>

          <div className="relative w-full sm:w-64">
            <input
              type="text"
              placeholder="Search"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full px-4 py-2.5 pl-9 rounded-md border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-900 text-neutral-900 dark:text-neutral-100 placeholder-neutral-400 dark:placeholder-neutral-500 focus:outline-none focus:ring-1 focus:ring-neutral-500 text-sm"
            />
            <svg className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-neutral-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
          </div>
        </div>

        <div className="rounded-md border border-neutral-200/80 dark:border-neutral-800/60">
          {loadingProfessors ? (
            <div className="text-center py-12">
              <p className="text-neutral-500 dark:text-neutral-400">Loading professors...</p>
            </div>
          ) : filteredProfessors.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-neutral-500 dark:text-neutral-400">
                {searchQuery ? 'No professors found matching your search' : 'No professors added yet'}
              </p>
            </div>
          ) : (
            <ul className="divide-y divide-neutral-200 dark:divide-neutral-800">
              {filteredProfessors.map((professor) => (
                <li
                  key={professor.id}
                  className="flex items-center justify-between px-4 py-3"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-full bg-neutral-200 dark:bg-neutral-700 flex items-center justify-center text-sm font-semibold text-neutral-600 dark:text-neutral-200">
                      {professor.name.charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <p className="text-sm font-medium text-neutral-900 dark:text-neutral-100">
                        {professor.name}
                      </p>
                      <p className="text-xs text-neutral-500 dark:text-neutral-400">
                        {professor.email}
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={() => confirmDeleteProfessor(professor)}
                    disabled={deletingProfessorId === professor.id}
                    className="text-xs font-medium text-rose-500 hover:text-rose-600 disabled:opacity-50"
                  >
                    {deletingProfessorId === professor.id ? 'Removing…' : 'Remove'}
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
      {professorPendingDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center px-4">
          <div className="absolute inset-0 bg-black/50" onClick={() => setProfessorPendingDelete(null)} />
          <div className="relative z-10 w-full max-w-sm rounded-lg border border-neutral-200/70 dark:border-neutral-800/70 bg-white dark:bg-neutral-950 shadow-xl">
            <div className="px-5 py-4 border-b border-neutral-200 dark:border-neutral-800">
              <h4 className="text-base font-semibold text-neutral-900 dark:text-neutral-100">Remove professor</h4>
            </div>
            <div className="px-5 py-4 space-y-3 text-sm text-neutral-600 dark:text-neutral-300">
              <p>
                Remove <span className="font-medium text-neutral-900 dark:text-neutral-100">{professorPendingDelete.name}</span> from the directory?
              </p>
              <p>This action cannot be undone.</p>
            </div>
            <div className="px-5 py-4 border-t border-neutral-200 dark:border-neutral-800 flex items-center justify-end gap-2">
              <button
                onClick={() => setProfessorPendingDelete(null)}
                className="px-4 py-2 text-xs font-medium rounded-md border border-neutral-300 dark:border-neutral-700 text-neutral-600 hover:text-neutral-900 dark:text-neutral-300 dark:hover:text-neutral-100"
              >
                Cancel
              </button>
              <button
                onClick={deleteProfessor}
                className="px-4 py-2 text-xs font-medium rounded-md bg-rose-500 hover:bg-rose-600 text-white"
              >
                Remove
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
