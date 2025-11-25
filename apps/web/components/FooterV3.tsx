'use client';

import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';

import translations from '@/translations';

const taglines = [
  'no cap just classics',
  'touch grass later',
  'literally us fr',
  'peak fiction only',
  'chronically online literature',
  'all rizz reserved',
  'caught reading in 4k',
  'its giving literature',
];

export default function FooterV3() {
  const router = useRouter();
  const [taglineIndex, setTaglineIndex] = useState(0);

  // Count available books
  const availableBooks = translations.filter((t) => t.status === 'available');
  const availableCount = availableBooks.length;
  const totalCount = translations.length;

  // Rotate taglines slowly (every 15 seconds)
  useEffect(() => {
    const interval = setInterval(() => {
      setTaglineIndex((prev) => (prev + 1) % taglines.length);
    }, 15000);
    return () => clearInterval(interval);
  }, []);

  // Navigate to random available book
  const surpriseMe = () => {
    if (availableBooks.length > 0) {
      const randomBook = availableBooks[Math.floor(Math.random() * availableBooks.length)];
      router.push(`/reading-room/${randomBook.slug}`);
    }
  };

  return (
    <footer className="relative mt-auto">
      {/* Main Footer - Compact 2-line design */}
      <div className="bg-gradient-to-t from-black/60 to-transparent backdrop-blur-sm border-t border-white/10">
        <div className="max-w-screen-lg mx-auto px-4 py-3">
          {/* Line 1: Brand + Stats */}
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-sm font-bold tracking-wider">BRAINROT PUBLISHING</h3>
            <div className="flex items-center gap-4 text-xs">
              <span className="text-green-400">📚 {availableCount} ready</span>
              <span className="text-yellow-400 hidden sm:inline">
                ⏳ {totalCount - availableCount} cooking
              </span>
              <button
                onClick={surpriseMe}
                className="text-purple-400 hover:text-purple-300 transition-colors"
                title="Read a random book"
              >
                🎲 surprise me
              </button>
            </div>
          </div>

          {/* Line 2: Copyright + Tagline + Links */}
          <div className="flex items-center justify-between text-xs text-white/60">
            <div className="flex items-center gap-2">
              <span>© brainrot publishing</span>
              <span className="text-white/30 hidden sm:inline">•</span>
              <span className="text-purple-400/70 hidden sm:inline transition-opacity duration-500">
                {taglines[taglineIndex]}
              </span>
            </div>
            <div className="flex items-center gap-3">
              <a
                href="https://github.com/phrazzld/brainrot"
                target="_blank"
                rel="noopener noreferrer"
                className="hover:text-purple-400 transition-colors"
                title="View source code"
              >
                github
              </a>
              <span className="text-white/30">•</span>
              <button
                className="hover:text-purple-400 transition-colors cursor-not-allowed opacity-50"
                title="Coming soon"
              >
                discord
              </button>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
}
