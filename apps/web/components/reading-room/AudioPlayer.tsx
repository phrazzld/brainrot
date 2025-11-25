'use client';

interface AudioPlayerProps {
  isPlaying: boolean;
  isAudioLoading: boolean;
  currentTime: number;
  totalTime: number;
  error: string | null;
  onTogglePlayPause: () => void;
  onOpenDownloadModal: () => void;
  waveformRef: React.RefObject<HTMLDivElement | null>;
  formatTime: (sec: number) => string;
}

/**
 * Audio player component for controlling playback and displaying the waveform.
 * @param props - The component props.
 */
export default function AudioPlayer(props: AudioPlayerProps) {
  const {
    isPlaying,
    isAudioLoading,
    currentTime,
    totalTime,
    error,
    onTogglePlayPause,
    onOpenDownloadModal,
    waveformRef,
    formatTime,
  } = props;
  if (isAudioLoading) {
    return (
      <div className="p-4 bg-[#2c2c3a] relative">
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-black/40 backdrop-blur-sm z-10">
          <div className="text-white text-sm font-body">loading up the vibes...</div>
          {/* Indeterminate progress bar */}
          <div className="w-48 h-1 bg-white/10 rounded-full overflow-hidden">
            <div
              className="h-full bg-peachy rounded-full animate-[loading_1.5s_ease-in-out_infinite]"
              style={{
                width: '40%',
                animation: 'loading 1.5s ease-in-out infinite',
              }}
            />
          </div>
          <div className="text-xs text-peachy/70">large file - might take a moment</div>
        </div>
        <div className="flex items-center gap-4">
          <div
            className="flex-1 h-[48px] bg-[#1f1f29] rounded-sm overflow-hidden"
            ref={waveformRef}
            data-testid="waveform-container-loading"
          />
          <button onClick={onTogglePlayPause} className="btn btn-primary" disabled>
            play
          </button>
          <div className="text-xs text-peachy whitespace-nowrap">0:00 / 0:00</div>
          <button onClick={onOpenDownloadModal} className="btn btn-secondary" disabled>
            download
          </button>
        </div>
        <style jsx>{`
          @keyframes loading {
            0% {
              transform: translateX(-100%);
            }
            50% {
              transform: translateX(250%);
            }
            100% {
              transform: translateX(-100%);
            }
          }
        `}</style>
      </div>
    );
  }

  return (
    <div className="p-4 bg-[#2c2c3a] relative">
      {/* Error banner */}
      {error && (
        <div className="mb-3 p-3 bg-peachy text-black rounded border border-peachy/50 text-sm font-body">
          ⚠️ {error}
        </div>
      )}

      <div className="flex items-center gap-4">
        {/* Use a stable ref for the waveform container */}
        <div
          className="flex-1 h-[48px] bg-[#1f1f29] rounded-sm overflow-hidden"
          ref={waveformRef}
          data-testid="waveform-container"
        />
        <button onClick={onTogglePlayPause} className="btn btn-primary">
          {isPlaying ? 'pause' : 'play'}
        </button>
        <div className="text-xs text-peachy whitespace-nowrap">
          {formatTime(currentTime)} / {formatTime(totalTime)}
        </div>
        <button onClick={onOpenDownloadModal} className="btn btn-secondary">
          download
        </button>
      </div>
    </div>
  );
}
