"use client";

import React from "react";
import LoginCard from "./LoginCard";

interface AdminLoginCardProps {
  onSuccess: () => void;
}

export default function AdminLoginCard({ onSuccess }: AdminLoginCardProps) {
  const handleSubmit = async (password: string): Promise<boolean> => {
    try {
      const response = await fetch("/api/auth/password-login", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({ role: "admin", password })
      });

      const result = await response.json();

      if (!response.ok || !result?.success) {
        throw new Error(result?.error || "Invalid password");
      }

      onSuccess();
      return true;
    } catch (error) {
      console.error("Admin login failed", error);
      return false;
    }
  };

  return (
    <LoginCard
      title="Administrator"
      placeholder="Password"
      onSubmit={handleSubmit}
    />
  );
}

