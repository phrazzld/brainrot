import Image from 'next/image';
import Link from 'next/link';
import { Suspense } from 'react';

import { translations } from '@/utils/translationsLoader';

// Simple skeleton components
function CardSkeleton() {
  return (
    <div className="card animate-pulse">
      <div className="w-full h-48 bg-gray-700 rounded"></div>
      <div className="card-content">
        <div className="h-6 bg-gray-700 rounded mb-2"></div>
        <div className="h-4 bg-gray-600 rounded mb-4"></div>
        <div className="card-footer">
          <div className="h-10 w-24 bg-gray-600 rounded"></div>
        </div>
      </div>
    </div>
  );
}

function ExploreGrid() {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-10">
      {translations.map((t) => {
        const isAvailable = t.available === true;
        return (
          <div
            key={t.slug}
            className={`card relative ${!isAvailable ? 'opacity-70 grayscale' : ''}`}
          >
            <Image
              src={t.coverImage || ''}
              alt={t.title}
              width={800}
              height={600}
              className="w-full object-cover"
              priority={isAvailable} // Prioritize available book images
            />
            <div className="card-content">
              <h3 className="text-xl font-display mb-2">{t.title}</h3>
              <p className="text-sm mb-4">{t.description}</p>
              <div className="card-footer">
                {isAvailable ? (
                  <Link href={`/reading-room/${t.slug}`} className="btn btn-secondary">
                    read now
                  </Link>
                ) : (
                  <button className="btn btn-secondary cursor-not-allowed" title="coming soon">
                    coming soon
                  </button>
                )}
              </div>
            </div>
            {!isAvailable && (
              <div className="absolute top-2 right-2 bg-peachy text-black px-2 py-1 text-xs font-bold rounded">
                WIP
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

function GridSkeleton() {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-10">
      {Array.from({ length: 6 }).map((_, i) => (
        <CardSkeleton key={i} />
      ))}
    </div>
  );
}

export default function ExplorePage() {
  return (
    <section className="min-h-screen py-12 px-4 bg-midnight text-white">
      <h2 className="text-3xl md:text-4xl font-bold mb-10 tracking-wide text-lavender">
        explore our translations
      </h2>
      <Suspense fallback={<GridSkeleton />}>
        <ExploreGrid />
      </Suspense>
    </section>
  );
}
