"use client";

import React from "react";
import LoginCard from "./LoginCard";

interface AdminLoginCardProps {
  onSuccess: () => void;
}

// TODO: Move this to environment variable - NEVER hardcode passwords in production
const ADMIN_PASSWORD = "admin123";

export default function AdminLoginCard({ onSuccess }: AdminLoginCardProps) {
  const handleSubmit = async (password: string): Promise<boolean> => {
    // In production, validate against environment variable or database
    if (password === ADMIN_PASSWORD) {
      onSuccess();
      return true;
    }
    return false;
  };

  return (
    <LoginCard
      title="Administrator"
      placeholder="Password"
      onSubmit={handleSubmit}
    />
  );
}

