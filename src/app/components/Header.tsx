import Image from 'next/image';
import cowImage from '../../images/cow.png';
import AdminNavbar from './AdminNavbar';

interface HeaderProps {
  showAdminNav?: boolean;
  activeSection?: string;
  onSectionChange?: (section: string) => void;
}

export default function Header({ showAdminNav = false, activeSection, onSectionChange }: HeaderProps) {
  const title = showAdminNav ? 'I.S. Oral Defense Admin' : 'I.S. Oral Defense Scheduler';

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
                  {title}
                </h1>
                {showAdminNav && (
                  <span className="text-xs font-medium text-amber-600 dark:text-amber-400 uppercase tracking-wider">
                    Admin Portal
                  </span>
                )}
              </div>
            </div>
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