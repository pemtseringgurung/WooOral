"use client";

import React, { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import PasswordLoginCard from "@/app/components/PasswordLoginCard";
import ProfessorAvailabilityForm from "@/app/components/ProfessorAvailabilityForm";

export default function ProfessorPortal() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-white dark:bg-black flex items-center justify-center px-4 relative">
        <Link 
          href="/"
          className="absolute top-6 left-6 text-sm text-neutral-700 dark:text-neutral-300 hover:text-neutral-900 dark:hover:text-neutral-100 transition-colors underline decoration-neutral-300 dark:decoration-neutral-700 hover:decoration-neutral-900 dark:hover:decoration-neutral-100 underline-offset-4"
        >
          ← Back
        </Link>

        <div className="max-w-lg w-full">
          <div className="text-center mb-12">
            <div className="flex justify-center mb-5">
              <Image
                src="/cow.png"
                alt="College of Wooster"
                width={60}
                height={60}
                className="object-contain"
                priority
              />
            </div>
            <h1 className="text-xl font-medium text-neutral-900 dark:text-neutral-100">
              Professor Portal
            </h1>
          </div>

          <div className="max-w-xs mx-auto">
            <PasswordLoginCard 
              type="professor" 
              onSuccess={() => setIsAuthenticated(true)} 
            />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-neutral-50 dark:bg-neutral-950">
      <header className="w-full bg-white/80 dark:bg-neutral-950/80 backdrop-blur border-b border-slate-200 dark:border-neutral-800">
        <nav className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-3">
              <Image
                src="/cow.png"
                alt="Wooster shield"
                width={36}
                height={36}
                className="rounded"
              />
              <div className="flex flex-col">
                <h1 className="text-lg sm:text-xl font-semibold text-slate-900 dark:text-slate-100">
                  I.S. Oral Defense Professor
                </h1>
                <span className="text-xs font-medium text-amber-600 dark:text-amber-400 uppercase tracking-wider">
                  Professor Portal
                </span>
              </div>
            </div>
          </div>
        </nav>
      </header>
      <main className="max-w-4xl mx-auto py-8 px-4 sm:px-6 lg:px-8">
        <ProfessorAvailabilityForm />
      </main>
    </div>
  );
}
