"use client";

import React from "react";
import Header from "@/app/components/Header";
import ProfessorSection from "../components/ProfessorSection";
import StudentSection from "../components/StudentSection";

export default function AdminDashboard() {
  return (
    <div className="min-h-screen bg-gray-50 dark:bg-neutral-950">
      <Header />
      <main className="max-w-7xl mx-auto py-8 px-4 sm:px-6 lg:px-8">
        <h2 className="text-3xl font-bold text-slate-900 dark:text-slate-100 mb-8">Admin Dashboard</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <ProfessorSection />
          </div>
          <div>
            <StudentSection />
          </div>
        </div>
      </main>
    </div>
  );
}