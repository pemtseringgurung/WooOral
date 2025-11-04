"use client";

import React, { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import Header from "@/app/components/Header";
import PasswordLoginCard from "@/app/components/PasswordLoginCard";

export default function StudentPortal() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-white dark:bg-black flex items-center justify-center px-4 relative">
        <Link 
          href="/"
          className="absolute top-6 left-6 inline-flex items-center gap-2 px-4 py-2 rounded-lg border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-900 text-sm font-medium text-neutral-700 dark:text-neutral-300 hover:bg-neutral-50 dark:hover:bg-neutral-800 hover:border-neutral-400 dark:hover:border-neutral-600 transition-all"
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
              Student Portal
            </h1>
          </div>

          <div className="max-w-xs mx-auto">
            <PasswordLoginCard 
              type="student" 
              onSuccess={() => setIsAuthenticated(true)} 
            />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-neutral-50 dark:bg-neutral-950">
      <Header portalType="student" />
      <main className="max-w-4xl mx-auto py-8 px-4 sm:px-6 lg:px-8">
      </main>
    </div>
  );
}
