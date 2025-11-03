"use client";

import { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import PasswordLoginCard from "@/app/components/PasswordLoginCard";

type VideoInfo = {
  title: string;
  url: string;
};

const videos: VideoInfo[] = [
  {
    title: "Student walkthrough",
    url: "https://www.youtube.com/embed/watch"
  },
  {
    title: "Professor walkthrough",
    url: "https://www.youtube.com/embed/watch"
  },
  {
    title: "Admin walkthrough",
    url: "https://www.youtube.com/embed/efo3BK4JWtA"
  }
];

export default function Home() {
  const [showHelp, setShowHelp] = useState(false);

  return (
    <div className="min-h-screen bg-white dark:bg-black flex items-center justify-center px-4 relative">
      <Link 
        href="/admin"
        className="absolute top-6 right-6 inline-flex items-center gap-2 px-4 py-2 rounded-full border border-neutral-300/70 dark:border-neutral-700 bg-white/80 dark:bg-neutral-900/70 text-sm font-medium text-neutral-700 dark:text-neutral-100 shadow-sm hover:shadow-md hover:border-neutral-400 dark:hover:border-neutral-600 transition-all"
      >
        Admin Portal
      </Link>

      <div className="max-w-2xl w-full">
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
            I.S. Oral Defense Scheduler
          </h1>
        </div>

        <div className="grid md:grid-cols-2 gap-8 max-w-lg mx-auto">
          <PasswordLoginCard type="student" />
          <PasswordLoginCard type="professor" />
        </div>

        <div className="flex justify-center mt-10">
          <button
            onClick={() => setShowHelp(true)}
            className="inline-flex items-center gap-2 px-5 py-2 rounded-full border border-neutral-300/70 dark:border-neutral-700 bg-white/80 dark:bg-neutral-900/70 text-sm font-medium text-neutral-700 dark:text-neutral-100 shadow-sm hover:shadow-md hover:border-neutral-400 dark:hover:border-neutral-600 transition-all"
          >
            <span>Help?</span>
          </button>
        </div>
      </div>

      {showHelp && (
        <div className="fixed inset-0 z-50 flex items-center justify-center px-4">
          <div className="absolute inset-0 bg-black/50" onClick={() => setShowHelp(false)} />
          <div className="relative z-10 w-full max-w-4xl rounded-lg border border-neutral-200/70 dark:border-neutral-800/70 bg-white dark:bg-neutral-950 shadow-xl">
            <div className="px-6 py-4 border-b border-neutral-200 dark:border-neutral-800 flex items-center justify-between">
              <div>
                <h2 className="text-lg font-semibold text-neutral-900 dark:text-neutral-100">How it works</h2>
                <p className="text-xs text-neutral-500 dark:text-neutral-400">Quick video walkthroughs for each role</p>
              </div>
              <button
                onClick={() => setShowHelp(false)}
                className="text-sm text-neutral-500 hover:text-neutral-700 dark:text-neutral-400 dark:hover:text-neutral-200"
              >
                Close
              </button>
            </div>
            <div className="px-6 py-5 max-h-[75vh] overflow-y-auto">
              {/* Top row: Student & Professor side by side */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {videos.slice(0, 2).map((video) => (
                  <div key={video.title} className="space-y-2">
                    <h3 className="text-sm font-medium text-neutral-800 dark:text-neutral-200 uppercase tracking-wide text-center">
                      {video.title}
                    </h3>
                    <div className="relative w-full overflow-hidden rounded-lg aspect-video bg-black/80">
                      <iframe
                        src={video.url}
                        title={video.title}
                        className="absolute inset-0 w-full h-full"
                        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                        allowFullScreen
                      />
                    </div>
                  </div>
                ))}
              </div>
              {/* Bottom row: Admin centered */}
              {videos[2] && (
                <div className="mt-6 flex justify-center">
                  <div className="w-full md:w-3/4 lg:w-1/2 space-y-2">
                    <h3 className="text-sm font-medium text-neutral-800 dark:text-neutral-200 uppercase tracking-wide text-center">
                      {videos[2].title}
                    </h3>
                    <div className="relative w-full overflow-hidden rounded-lg aspect-video bg-black/80">
                      <iframe
                        src={videos[2].url}
                        title={videos[2].title}
                        className="absolute inset-0 w-full h-full"
                        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                        allowFullScreen
                      />
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
