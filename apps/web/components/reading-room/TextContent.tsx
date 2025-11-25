'use client';

interface TextContentProps {
  isLoading: boolean;
  content: string;
}

/**
 * Skeleton loader that mimics text layout with pulsing gray bars
 */
function SkeletonLoader() {
  // Generate 12 skeleton lines with varying widths to mimic paragraphs
  const skeletonLines = [
    'w-full',
    'w-11/12',
    'w-full',
    'w-10/12',
    'w-8/12', // Short line (paragraph break)
    '',       // Empty line
    'w-full',
    'w-full',
    'w-9/12',
    'w-7/12', // Short line (paragraph break)
    '',       // Empty line
    'w-full',
  ];

  return (
    <div className="space-y-3">
      <div className="text-center text-peachy text-sm mb-8 animate-pulse">
        loading chapter vibes...
      </div>
      {skeletonLines.map((width, i) => (
        <div key={i} className={`h-4 bg-white/10 rounded animate-pulse ${width}`} />
      ))}
    </div>
  );
}

export default function TextContent({ isLoading, content }: TextContentProps) {
  const lines = content.split('\n').map((line, i) => (
    <div key={i} className="my-1">
      {line.trim() ? line : <>&nbsp;</>}
    </div>
  ));

  return (
    <main className="flex-1 overflow-y-auto p-4 max-w-3xl mx-auto">
      {isLoading ? <SkeletonLoader /> : lines}
    </main>
  );
}
