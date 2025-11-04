import Image from 'next/image';
import Link from 'next/link';
import cowImage from '../../images/cow.png';
import AdminNavbar from './AdminNavbar';

interface HeaderProps {
  showAdminNav?: boolean;
  activeSection?: string;
  onSectionChange?: (section: string) => void;
  portalType?: 'admin' | 'professor' | 'student';
}

export default function Header({ showAdminNav = false, activeSection, onSectionChange, portalType }: HeaderProps) {
  return (
    <div>
      <header className="w-full bg-white/80 dark:bg-neutral-950/80 backdrop-blur border-b border-slate-200 dark:border-neutral-800">
        <nav className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-3">
              <Image
                src={cowImage}
                alt="Wooster shield"
                width={36}
                height={36}
                className="rounded"
              />
              <div className="flex flex-col">
                <h1 className="text-lg sm:text-xl font-semibold text-slate-900 dark:text-slate-100">
                  I.S. Oral Defense Scheduler
                </h1>
                {portalType && (
                  <span className="text-xs font-medium text-amber-600 dark:text-amber-400 uppercase tracking-wider">
                    {portalType === 'admin' && 'Admin Portal'}
                    {portalType === 'professor' && 'Professor Portal'}
                    {portalType === 'student' && 'Student Portal'}
                  </span>
                )}
              </div>
            </div>
            <Link
              href="/"
              className="inline-flex items-center gap-2 px-4 py-2 rounded-lg border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-900 text-sm font-medium text-neutral-700 dark:text-neutral-300 hover:bg-neutral-50 dark:hover:bg-neutral-800 hover:border-neutral-400 dark:hover:border-neutral-600 transition-all"
            >
              Home
            </Link>
          </div>
        </nav>
      </header>
      {showAdminNav && (
        <AdminNavbar 
          activeSection={activeSection} 
          onSectionChange={onSectionChange} 
        />
      )}
    </div>
  );
}