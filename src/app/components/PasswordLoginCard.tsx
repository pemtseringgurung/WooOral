"use client";

import React from "react";
import { getSupabaseClient } from "@/lib/supabase";
import LoginCard from "./LoginCard";

interface PasswordLoginCardProps {
  type: "student" | "professor";
  onSuccess?: () => void;
}

export default function PasswordLoginCard({ type, onSuccess }: PasswordLoginCardProps) {
  const handleSubmit = async (password: string): Promise<boolean> => {
    try {
      const supabase = getSupabaseClient();
      const field = type === "student" ? "student_password" : "professor_password";
      
      const { data, error: dbError } = await supabase
        .from('passwords')
        .select(field)
        .order('created_at', { ascending: false })
        .limit(1)
        .single();

      if (dbError || !data || data[field] !== password) {
        return false;
      }

      if (onSuccess) {
        onSuccess();
      }
      // TODO: Redirect to appropriate dashboard
      return true;
    } catch (err) {
      return false;
    }
  };

  const isStudent = type === "student";
  const focusRing = isStudent 
    ? "focus:ring-blue-500 focus:border-blue-500" 
    : "focus:ring-yellow-500 focus:border-yellow-500";

  return (
    <LoginCard
      title={type === "student" ? "Student" : "Professor"}
      placeholder="Enter password"
      onSubmit={handleSubmit}
      focusRingColor={focusRing}
    />
  );
}

