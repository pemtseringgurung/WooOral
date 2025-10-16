"use client";

import React from "react";
import LoginCard from "./LoginCard";

interface PasswordLoginCardProps {
  type: "student" | "professor";
  onSuccess?: () => void;
}

export default function PasswordLoginCard({ type, onSuccess }: PasswordLoginCardProps) {
  const handleSubmit = async (password: string): Promise<boolean> => {
    try {
      const response = await fetch("/api/auth/password-login", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({ role: type, password })
      });

      const result = await response.json();

      if (!response.ok || !result?.success) {
        throw new Error(result?.error || "Invalid password");
      }

      if (onSuccess) {
        onSuccess();
      }
      // TODO: Redirect to appropriate dashboard
      return true;
    } catch (error) {
      console.error(`${type} login failed`, error);
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

