'use client';

import { useEffect, useState } from 'react';

const copyrightPhrases = [
  "© brainrot publishing • we're so back",
  '© 2024 no cap productions (real)',
  '© brainrot inc • caught in 4k 📸',
  '© certified hood classic™',
  '© brainrot publishing • all rizz reserved',
  '© delulu is the solulu • patent pending',
  "© brainrot media • mom said it's our turn",
  '© peak fiction enterprises',
  '© touch grass? never heard of her',
  '© brainrot publishing • its giving literature',
];

const achievements = [
  { icon: '🏆', title: 'Achievement Unlocked!', desc: 'Found the Footer (Rare: 0.1% of users)' },
  { icon: '💀', title: "You're Cooked!", desc: 'Scrolled this far unironically' },
  { icon: '🧠', title: 'Brain Cell Lost!', desc: 'One less to worry about fr' },
  { icon: '📚', title: 'Literally Me!', desc: "You're just like Gatsby fr fr" },
  { icon: '🗿', title: 'Stone Face Achieved!', desc: 'Based and literature-pilled' },
  { icon: '🔥', title: 'Straight Fire!', desc: 'Your taste in books is bussin' },
];

export default function FooterV2() {
  const [copyrightIndex, setCopyrightIndex] = useState(0);
  const [showAchievement, setShowAchievement] = useState(false);
  const [achievement, setAchievement] = useState(achievements[0]);
  const [hasTriggered, setHasTriggered] = useState(false);

  // Rotate copyright phrases
  useEffect(() => {
    const interval = setInterval(() => {
      setCopyrightIndex((prev) => (prev + 1) % copyrightPhrases.length);
    }, 3000);
    return () => clearInterval(interval);
  }, []);

  // Random achievement on mount (20% chance)
  useEffect(() => {
    if (!hasTriggered && Math.random() < 0.2) {
      const randomAchievement = achievements[Math.floor(Math.random() * achievements.length)];
      setAchievement(randomAchievement);
      setTimeout(() => {
        setShowAchievement(true);
        setHasTriggered(true);
        setTimeout(() => setShowAchievement(false), 4000);
      }, 1000);
    }
  }, [hasTriggered]);

  return (
    <footer className="relative mt-auto bg-gradient-to-r from-purple-950/50 to-pink-950/50 backdrop-blur-sm border-t border-white/10">
      {/* Achievement Notification */}
      <div
        className={`fixed bottom-20 right-4 bg-black/90 text-white p-4 rounded-lg flex items-center gap-3 transition-all duration-500 transform ${
          showAchievement ? 'translate-x-0 opacity-100' : 'translate-x-full opacity-0'
        } z-50 border border-green-400/50 shadow-[0_0_20px_rgba(74,222,128,0.3)]`}
      >
        <div className="text-3xl animate-bounce">{achievement.icon}</div>
        <div>
          <p className="font-bold text-green-400">{achievement.title}</p>
          <p className="text-xs text-gray-300">{achievement.desc}</p>
        </div>
      </div>

      <div className="mx-auto max-w-screen-lg px-4 py-6">
        {/* Main brainrot text with glitch effect */}
        <div className="text-center mb-4">
          <h3
            className="text-lg font-bold glitch-text inline-block"
            data-text="BRAINROT PUBLISHING"
          >
            BRAINROT PUBLISHING
          </h3>
        </div>

        {/* Rotating copyright line */}
        <div className="text-center mb-4 h-6 relative">
          <p className="text-sm text-white/70 transition-all duration-500 absolute w-full left-0">
            {copyrightPhrases[copyrightIndex]}
          </p>
        </div>

        {/* Terminal-style links */}
        <div className="flex flex-wrap justify-center gap-4 text-xs font-mono">
          <a
            href="https://github.com/phrazzld/brainrot"
            target="_blank"
            rel="noopener noreferrer"
            className="group text-green-400 hover:text-green-300 transition-all"
          >
            <span className="opacity-60">$</span> git clone
            <span className="group-hover:inline hidden ml-1">/for-the-nerds</span>
            <span className="group-hover:hidden ml-1">📁</span>
          </a>

          <span className="text-gray-500">|</span>

          <button
            className="group text-blue-400 hover:text-blue-300 transition-all cursor-not-allowed"
            title="X/Twitter (rip bozo)"
          >
            <span className="opacity-60">$</span> bird.app
            <span className="group-hover:inline hidden ml-1">--deprecated</span>
            <span className="group-hover:hidden ml-1">🐦</span>
          </button>

          <span className="text-gray-500">|</span>

          <button
            className="group text-purple-400 hover:text-purple-300 transition-all cursor-not-allowed"
            title="Discord (we live here fr)"
          >
            <span className="opacity-60">$</span> discord
            <span className="group-hover:inline hidden ml-1">/grass-touching-optional</span>
            <span className="group-hover:hidden ml-1">💬</span>
          </button>

          <span className="text-gray-500">|</span>

          <button
            className="group text-red-400 hover:text-red-300 transition-all cursor-not-allowed"
            title="Touch Grass API"
          >
            <span className="opacity-60">$</span> touch grass
            <span className="group-hover:inline hidden ml-1">: command not found</span>
            <span className="group-hover:hidden ml-1">🌱</span>
          </button>
        </div>

        {/* Status indicators */}
        <div className="flex justify-center gap-3 mt-4 text-xs">
          <span className="text-green-400 animate-pulse">● ONLINE</span>
          <span className="text-yellow-400">⚡ BRAIN CELLS: 3</span>
          <span className="text-purple-400">📖 LITERACY: MAX</span>
          <span className="text-red-400">🔥 VIBE CHECK: PASSED</span>
        </div>

        {/* System message */}
        <div className="text-center mt-4 text-xs text-gray-500 font-mono">
          [SYSTEM]: warning: prolonged exposure may cause uncontrollable urge to read actual books
        </div>
      </div>
    </footer>
  );
}
