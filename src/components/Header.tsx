import Image from 'next/image';
import Link from 'next/link';
import cowImage from '../images/cow.png';

export default function Header() {
  return (
    <header className="w-full bg-white shadow-sm">
      <nav className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          <div className="flex items-center">
            <div className="mr-4">
              <Image
                src={cowImage}
                alt="Cow logo"
                width={40}
                height={40}
                className="rounded"
              />
            </div>
            <h1 className="text-xl font-bold text-gray-900">IS Oral Defense Application</h1>
          </div>
          <div className="flex space-x-4">

          </div>
        </div>
      </nav>
    </header>
  );
}