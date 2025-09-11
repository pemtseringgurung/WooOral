import Image from 'next/image';
import cowImage from '../../images/cow.png';

export default function Header() {
  return (
    <header className="w-full bg-white/80 dark:bg-neutral-950/80 backdrop-blur border-b border-slate-200 dark:border-neutral-800">
      <nav className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          <div className="flex items-center">
            <div className="mr-3">
              <Image
                src={cowImage}
                alt="Cow logo"
                width={36}
                height={36}
                className="rounded"
              />
            </div>
            <h1 className="text-lg sm:text-xl font-semibold text-slate-900 dark:text-slate-100">IS Oral Defense Application</h1>
          </div>
          <div className="flex items-center gap-2">
          </div>
        </div>
      </nav>
    </header>
  );
}