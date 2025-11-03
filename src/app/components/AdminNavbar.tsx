"use client";

import React, { useState } from "react";
import { Lock, MapPin, UserPlus, ChevronDown, Clock } from "lucide-react";

interface AdminNavbarProps {
  activeSection?: string;
  onSectionChange?: (section: string) => void;
}

export default function AdminNavbar({ activeSection = "defense-period", onSectionChange }: AdminNavbarProps) {
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);

  const navItems = [
    {
      id: "defense-period",
      label: "Set Defense Period",
      icon: <Clock className="w-4 h-4" />,
      description: "Configure oral defense time periods"
    },
    {
      id: "password",
      label: "Set Password",
      icon: <Lock className="w-4 h-4" />,
      description: "Manage admin passwords"
    },
    {
      id: "room-availability",
      label: "Room Availability",
      icon: <MapPin className="w-4 h-4" />,
      description: "Manage room schedules"
    },
    {
      id: "add-professors",
      label: "Add Professors",
      icon: <UserPlus className="w-4 h-4" />,
      description: "Manage professor accounts"
    }
  ];

  const handleSectionClick = (sectionId: string) => {
    onSectionChange?.(sectionId);
    setIsDropdownOpen(false);
  };

  const activeItem = navItems.find(item => item.id === activeSection);

  return (
    <nav className="bg-neutral-100 dark:bg-neutral-900 border-b border-neutral-200 dark:border-neutral-800 px-4 py-3">
        <div className="hidden md:flex justify-center gap-2">
          <div className="flex items-center gap-1">
            {navItems.map((item) => (
              <button
                key={item.id}
                onClick={() => handleSectionClick(item.id)}
                className={`relative px-4 py-2 text-sm font-medium transition-all duration-200 ${
                  activeSection === item.id
                    ? "text-neutral-900 dark:text-neutral-100"
                    : "text-neutral-500 dark:text-neutral-400 hover:text-neutral-700 dark:hover:text-neutral-300"
                }`}
              >
                {item.label}
                {activeSection === item.id && (
                  <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-amber-400 rounded-full" />
                )}
              </button>
            ))}
          </div>
        </div>

        <div className="md:hidden py-3">
          <div className="relative">
            <button
              onClick={() => setIsDropdownOpen(!isDropdownOpen)}
              className="w-full flex items-center justify-between px-4 py-2.5 text-sm font-medium text-neutral-900 dark:text-neutral-100 bg-neutral-50 dark:bg-neutral-900 rounded-lg border-0"
            >
              <span>{activeItem?.label || "Select Section"}</span>
              <ChevronDown className={`w-4 h-4 transition-transform duration-200 ${isDropdownOpen ? "rotate-180" : ""}`} />
            </button>

            {isDropdownOpen && (
              <div className="absolute top-full left-0 right-0 mt-1 bg-white dark:bg-neutral-900 rounded-lg shadow-lg border border-neutral-200/50 dark:border-neutral-800/50 z-50 overflow-hidden">
                {navItems.map((item) => (
                  <button
                    key={item.id}
                    onClick={() => handleSectionClick(item.id)}
                    className={`w-full px-4 py-3 text-left text-sm font-medium transition-colors duration-150 ${
                      activeSection === item.id 
                        ? "text-neutral-900 dark:text-neutral-100 bg-amber-50 dark:bg-amber-900/10" 
                        : "text-neutral-600 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-neutral-100 hover:bg-neutral-50 dark:hover:bg-neutral-800"
                    }`}
                  >
                    {item.label}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
    </nav>
  );
}
