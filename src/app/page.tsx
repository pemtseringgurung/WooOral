import Image from "next/image";
import Link from "next/link";
import PasswordLoginCard from "@/app/components/PasswordLoginCard";

export default function Home() {
  return (
    <div className="min-h-screen bg-white dark:bg-black flex items-center justify-center px-4 relative">
      <Link 
        href="/admin"
        className="absolute top-6 right-6 text-sm text-neutral-700 dark:text-neutral-300 hover:text-neutral-900 dark:hover:text-neutral-100 transition-colors underline decoration-neutral-300 dark:decoration-neutral-700 hover:decoration-neutral-900 dark:hover:decoration-neutral-100 underline-offset-4"
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
      </div>
    </div>
  );
}
