'use client';

import Image from 'next/image';
import Link from 'next/link';
import { useEffect, useState } from 'react';

import { getProgress } from '@/lib/readingProgress';
import translations from '@/translations';

export default function ExplorePage() {
  // Track which books have saved progress (slug -> chapter index)
  const [bookProgress, setBookProgress] = useState<Record<string, number>>({});

  // Load saved progress for all books on mount
  useEffect(() => {
    const progress: Record<string, number> = {};
    translations.forEach((t) => {
      const saved = getProgress(t.slug);
      if (saved) {
        progress[t.slug] = saved.chapterIndex;
      }
    });
    setBookProgress(progress);
  }, []);

  return (
    <section className="min-h-screen py-12 px-4 bg-midnight text-white">
      <h2 className="text-3xl md:text-4xl font-display font-bold mb-12 text-lavender">
        explore our translations
      </h2>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-12">
        {translations.map((t) => {
          const isAvailable = t.status === 'available';
          return (
            <div
              key={t.slug}
              className={`card relative ${!isAvailable ? 'opacity-70 grayscale' : ''}`}
            >
              <Image
                src={t.coverImage}
                alt={t.title}
                width={800}
                height={600}
                loading="lazy"
                placeholder="blur"
                blurDataURL="data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iODAwIiBoZWlnaHQ9IjYwMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cmVjdCB3aWR0aD0iODAwIiBoZWlnaHQ9IjYwMCIgZmlsbD0iIzFjMWMyOCIvPjwvc3ZnPg=="
                className="w-full object-cover"
              />
              <div className="card-content">
                <h3 className="text-xl font-display font-bold mb-2">{t.title}</h3>
                <p className="text-sm font-body mb-4">{t.shortDescription}</p>
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
                  {!!t.purchaseUrl && (
                    <Link
                      href={t.purchaseUrl}
                      className="btn btn-primary ml-4"
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      buy now
                    </Link>
                  )}
                </div>
              </div>
              {!isAvailable && (
                <div className="absolute top-2 right-2 bg-peachy text-black px-2 py-1 text-xs font-bold rounded">
                  WIP
                </div>
              )}
              {bookProgress[t.slug] !== undefined && (
                <div className="absolute top-2 left-2 bg-lavender text-midnight px-2 py-1 text-xs font-bold rounded">
                  Continue - Chapter {bookProgress[t.slug] + 1}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </section>
  );
}
