

/**
 * @jest-environment jsdom
 */
import { vi, describe, it, test, expect, beforeAll, beforeEach, afterAll, afterEach } from 'vitest';
import { useParams, useRouter, useSearchParams } from 'next/navigation';

import '@testing-library/jest-dom';

// Import the component after setting up mocks
import ReadingRoom from '../../app/reading-room/[slug]/page';
import { fetchTextWithFallback } from '../../utils/getBlobUrl';
import { act, render, screen, waitFor } from '../utils/test-utils';

// Mock the utils module
vi.mock('../../utils/getBlobUrl', () => ({
  fetchTextWithFallback: vi.fn(),
}));

// Mock next/navigation
vi.mock('next/navigation', () => ({
  useParams: vi.fn(),
  useRouter: vi.fn(),
  useSearchParams: vi.fn(),
}));

// Mock translations
vi.mock('../../translations', () => [
  {
    slug: 'test-book',
    title: 'Test Book',
    shortDescription: 'A test book',
    coverImage: '/assets/test-book/images/test-cover.png',
    status: 'available',
    chapters: [
      {
        title: 'Chapter 1',
        text: '/assets/test-book/text/brainrot/chapter-1.txt',
        audioSrc: '/assets/test-book/audio/chapter-1.mp3',
      },
      {
        title: 'Chapter 2',
        text: '/assets/test-book/text/brainrot/chapter-2.txt',
        audioSrc: null,
      },
      {
        title: 'Chapter 3',
        text: '/assets/test-book/text/brainrot/chapter-3.txt',
        audioSrc: '/assets/test-book/audio/chapter-3.mp3',
      },
    ],
  },
]);

// Set up mock implementations for navigation hooks
const mockRouter = {
  push: vi.fn(),
  replace: vi.fn(),
};

const mockSearchParams = {
  get: vi.fn(),
};

// Mock WaveSurfer
vi.mock('wavesurfer', () => ({
  __esModule: true,
  default: {
    create: vi.fn().mockReturnValue({
      load: vi.fn(),
      on: vi.fn(),
      destroy: vi.fn(),
      playPause: vi.fn(),
      isPlaying: vi.fn().mockReturnValue(false),
      getCurrentTime: vi.fn().mockReturnValue(0),
      getDuration: vi.fn().mockReturnValue(120),
      seekTo: vi.fn(),
      pause: vi.fn(),
    }),
  },
}));

describe('Reading Room with Blob Storage', () => {
  beforeEach(() => {
    vi.clearAllMocks();

    // Default mock implementations
    (useParams as ReturnType<typeof vi.fn>).mockReturnValue({ slug: 'test-book' });
    (useRouter as ReturnType<typeof vi.fn>).mockReturnValue(mockRouter);
    (useSearchParams as ReturnType<typeof vi.fn>).mockReturnValue(mockSearchParams);
    mockSearchParams.get.mockImplementation((param) => {
      if (param === 'c') return '0';
      if (param === 't') return null;
      return null;
    });

    // Mock the fetchTextWithFallback function
    (fetchTextWithFallback as ReturnType<typeof vi.fn>).mockResolvedValue(
      'Test chapter content from Blob storage',
    );

    // getAssetUrlWithFallback no longer used in component
  });

  it('should render the reading room component with text from Blob storage', async () => {
    await act(async () => {
      render(<ReadingRoom />);
    });

    // Check if the component is trying to fetch text from Blob
    expect(fetchTextWithFallback).toHaveBeenCalledWith(
      '/assets/test-book/text/brainrot/chapter-1.txt',
    );

    // Wait for text to be loaded
    await waitFor(() => {
      expect(screen.getByText('Test chapter content from Blob storage')).toBeInTheDocument();
    });
  });

  it('should handle fetch failures gracefully', async () => {
    // Mock a fetch failure
    (fetchTextWithFallback as ReturnType<typeof vi.fn>).mockRejectedValue(new Error('Failed to fetch'));

    await act(async () => {
      render(<ReadingRoom />);
    });

    // Check if the component is trying to fetch text from Blob
    expect(fetchTextWithFallback).toHaveBeenCalledWith(
      '/assets/test-book/text/brainrot/chapter-1.txt',
    );

    // Wait for error message to be displayed
    await waitFor(() => {
      expect(screen.getByText(/Error loading text/)).toBeInTheDocument();
    });
  });

  it('should change chapter when chapter index changes', async () => {
    // Define the rerender function with proper type
    let rerenderFn: (ui: React.ReactElement) => void;

    await act(async () => {
      const { rerender } = render(<ReadingRoom />);
      rerenderFn = rerender;
    });

    // Initial chapter
    expect(fetchTextWithFallback).toHaveBeenCalledWith(
      '/assets/test-book/text/brainrot/chapter-1.txt',
    );

    // Update search params to change chapter
    mockSearchParams.get.mockImplementation((param) => {
      if (param === 'c') return '1';
      if (param === 't') return null;
      return null;
    });

    // Clear previous calls to track new calls
    (fetchTextWithFallback as ReturnType<typeof vi.fn>).mockClear();

    // Re-render with new chapter
    await act(async () => {
      rerenderFn(<ReadingRoom />);
    });

    // Should fetch new chapter
    expect(fetchTextWithFallback).toHaveBeenCalledWith(
      '/assets/test-book/text/brainrot/chapter-2.txt',
    );
  });

  it('should render audio player if audioSrc is available', async () => {
    await act(async () => {
      render(<ReadingRoom />);
    });

    // Wait for the audio player to be present
    await waitFor(() => {
      // Because the WaveSurfer is mocked, we can check for the play button
      expect(screen.getByText('play')).toBeInTheDocument();
      expect(screen.getByText('0:00 / 2:00')).toBeInTheDocument(); // 120 seconds = 2:00
    });
  });

  it('should not attempt to load audio when audioSrc is null', async () => {
    // Set chapter to one without audio
    mockSearchParams.get.mockImplementation((param) => {
      if (param === 'c') return '1'; // Chapter 2 has no audio
      if (param === 't') return null;
      return null;
    });

    await act(async () => {
      render(<ReadingRoom />);
    });

    // Should still fetch text
    expect(fetchTextWithFallback).toHaveBeenCalledWith(
      '/assets/test-book/text/brainrot/chapter-2.txt',
    );

    // Audio player should not be displayed
    await waitFor(() => {
      expect(screen.queryByText('play')).not.toBeInTheDocument();
    });
  });

  it('should handle changing to a chapter with audio', async () => {
    // Define the rerender function with proper type
    let rerenderFn: (ui: React.ReactElement) => void;

    // Start with chapter 1 (has audio)
    await act(async () => {
      const { rerender } = render(<ReadingRoom />);
      rerenderFn = rerender;
    });

    // Clear previous calls
    (fetchTextWithFallback as ReturnType<typeof vi.fn>).mockClear();

    // Change to chapter 2 (no audio)
    mockSearchParams.get.mockImplementation((param) => {
      if (param === 'c') return '1';
      if (param === 't') return null;
      return null;
    });

    await act(async () => {
      rerenderFn(<ReadingRoom />);
    });

    // Audio player should not be displayed for chapter 2
    await waitFor(() => {
      expect(screen.queryByText('play')).not.toBeInTheDocument();
    });

    // Then change to chapter 3 (has audio)
    mockSearchParams.get.mockImplementation((param) => {
      if (param === 'c') return '2';
      if (param === 't') return null;
      return null;
    });

    // Clear previous calls again
    (fetchTextWithFallback as ReturnType<typeof vi.fn>).mockClear();

    await act(async () => {
      rerenderFn(<ReadingRoom />);
    });

    // Audio player should be displayed for chapter 3
    await waitFor(() => {
      expect(screen.getByText('play')).toBeInTheDocument();
    });
  });
});
