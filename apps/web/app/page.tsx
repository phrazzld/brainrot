'use client';

import Link from 'next/link';

export default function HomePage() {
  return (
    <main className="relative min-h-screen flex flex-col">
      <section className="flex-1 flex flex-col items-center justify-center text-center px-4 py-16 md:py-32 bg-gradient-to-r from-lavender to-peachy overflow-hidden">
        <div className="absolute inset-0 pointer-events-none mix-blend-multiply opacity-30 bg-cover" />
        <div className="relative z-10 max-w-3xl">
          <h1 className="text-3xl md:text-4xl mb-6 glitch-text" data-text="brainrot publishing">
            brainrot publishing
          </h1>
          <p
            className="text-lg md:text-xl mb-8 font-body animate-fadeInUp"
            style={{ animationDelay: '0.6s', animationFillMode: 'both' }}
          >
            zoomer translations of classic literature
          </p>
          <Link href="/explore" className="btn btn-primary text-lg">
            start exploring
          </Link>
        </div>
      </section>

      {/* marquee pinned to the bottom */}
      <div className="whitespace-nowrap overflow-x-hidden bg-black text-peachy font-bold">
        <div className="flex animate-marquee-slow">
          <div className="flex shrink-0">
            <span className="mx-8">the bible</span>
            <span className="mx-8">the aeneid</span>
            <span className="mx-8">the republic</span>
            <span className="mx-8">the prince</span>
            <span className="mx-8">war and peace</span>
            <span className="mx-8">the quran</span>
            <span className="mx-8">don quixote</span>
            <span className="mx-8">anna karenina</span>
            <span className="mx-8">king lear</span>
            <span className="mx-8">romeo and juliet</span>
            <span className="mx-8">hamlet</span>
            <span className="mx-8">macbeth</span>
            <span className="mx-8">a midsummer night&apos;s dream</span>
          </div>
          <div className="flex shrink-0" aria-hidden="true">
            <span className="mx-8">the bible</span>
            <span className="mx-8">the aeneid</span>
            <span className="mx-8">the republic</span>
            <span className="mx-8">the prince</span>
            <span className="mx-8">war and peace</span>
            <span className="mx-8">the quran</span>
            <span className="mx-8">don quixote</span>
            <span className="mx-8">anna karenina</span>
            <span className="mx-8">king lear</span>
            <span className="mx-8">romeo and juliet</span>
            <span className="mx-8">hamlet</span>
            <span className="mx-8">macbeth</span>
            <span className="mx-8">a midsummer night&apos;s dream</span>
          </div>
        </div>
      </div>
    </main>
  );
}
