"use client";

import React, { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import Header from "@/app/components/Header";
import AddProfessorForm from "@/app/components/AddProfessorForm";
import SetDefensePeriodForm from "@/app/components/SetDefensePeriodForm";
import SetPasswordForm from "@/app/components/SetPasswordForm";
import AdminLoginCard from "@/app/components/AdminLoginCard";
import RoomAvailabilityForm from "@/app/components/RoomAvailabilityForm";

export default function AdminDashboard() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [activeSection, setActiveSection] = useState("defense-period");

  const renderContent = () => {
    switch (activeSection) {
      case "add-professors":
        return <AddProfessorForm />;
      
      case "defense-period":
        return <SetDefensePeriodForm />;
      
      case "password":
        return <SetPasswordForm />;

      case "room-availability":
        return <RoomAvailabilityForm />;

      default:
        return <SetDefensePeriodForm />;
    }
  };

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
              Admin Portal
            </h1>
          </div>

          <div className="max-w-xs mx-auto">
            <AdminLoginCard onSuccess={() => setIsAuthenticated(true)} />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-neutral-50 dark:bg-neutral-950">
      <Header 
        showAdminNav={true} 
        activeSection={activeSection} 
        onSectionChange={setActiveSection} 
      />
      <main className="max-w-4xl mx-auto py-8 px-4 sm:px-6 lg:px-8">
        {renderContent()}
      </main>
    </div>
  );
}