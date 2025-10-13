"use client";

import React, { useState } from "react";
import { Eye, EyeOff } from "lucide-react";

interface LoginCardProps {
  title: string;
  placeholder?: string;
  onSubmit: (password: string) => Promise<boolean>;
  focusRingColor?: string;
}

export default function LoginCard({ 
  title, 
  placeholder = "Enter password", 
  onSubmit,
  focusRingColor = "focus:ring-neutral-500 focus:border-neutral-500"
}: LoginCardProps) {
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError("");

    try {
      const success = await onSubmit(password);
      if (!success) {
        setError("Incorrect password");
      }
    } catch (err) {
      setError("An error occurred");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="space-y-4">
      <h2 className="text-sm font-medium text-neutral-500 dark:text-neutral-400 uppercase tracking-wide">
        {title}
      </h2>

      <form onSubmit={handleSubmit} className="space-y-3">
        <div className="relative">
          <input
            type={showPassword ? "text" : "password"}
            value={password}
            onChange={(e) => {
              setPassword(e.target.value);
              setError("");
            }}
            placeholder={placeholder}
            className={`w-full px-4 py-3 pr-11 bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-lg text-neutral-900 dark:text-neutral-100 placeholder-neutral-400 dark:placeholder-neutral-600 focus:outline-none focus:ring-2 ${focusRingColor} transition-all text-sm`}
            disabled={isLoading}
            required
          />
          <button
            type="button"
            onClick={() => setShowPassword(!showPassword)}
            className="absolute inset-y-0 right-0 pr-4 flex items-center text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-300 transition-colors"
            disabled={isLoading}
            aria-label={showPassword ? "Hide password" : "Show password"}
          >
            {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
          </button>
        </div>

        {error && (
          <p className="text-xs text-red-600 dark:text-red-400 px-1">{error}</p>
        )}

        <button
          type="submit"
          disabled={isLoading || !password}
          className="w-full bg-neutral-900 hover:bg-neutral-800 dark:bg-neutral-100 dark:hover:bg-neutral-200 text-white dark:text-neutral-900 disabled:opacity-40 disabled:cursor-not-allowed font-medium py-3 px-4 rounded-lg transition-all text-sm"
        >
          {isLoading ? "Verifying..." : "Continue"}
        </button>
      </form>
    </div>
  );
}

