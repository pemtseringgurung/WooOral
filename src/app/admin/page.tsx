"use client";

import React, { useState } from "react";
import Header from "@/app/components/Header";
import AddProfessorForm from "@/app/components/AddProfessorForm";
import SetDefensePeriodForm from "@/app/components/SetDefensePeriodForm";
import SetPasswordForm from "@/app/components/SetPasswordForm";

export default function AdminDashboard() {
  const [activeSection, setActiveSection] = useState("dashboard");

  const renderContent = () => {
    switch (activeSection) {
      case "add-professors":
        return <AddProfessorForm />;
      
      case "defense-period":
        return <SetDefensePeriodForm />;
      
      case "password":
        return <SetPasswordForm />;

      default:
        return (
          <div className="text-center py-16">
            <h3 className="text-2xl font-light text-neutral-600 dark:text-neutral-400 mb-8">
              Select a section from the navigation above
            </h3>
          </div>
        );
    }
  };

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