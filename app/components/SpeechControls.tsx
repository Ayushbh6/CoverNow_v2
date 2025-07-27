'use client';

import { useEffect, useState } from 'react';

interface SpeechControlsProps {
  isPlaying: boolean;
  isPaused: boolean;
  isMuted: boolean;
  currentSentence: string | null;
  queueLength: number;
  pauseAudio: () => void;
  resumeAudio: () => void;
  skipCurrent: () => void;
  toggleMute: () => void;
  clearQueue: () => void;
  className?: string;
}

export default function SpeechControls({
  isPlaying,
  isPaused,
  isMuted,
  currentSentence,
  queueLength,
  pauseAudio,
  resumeAudio,
  skipCurrent,
  toggleMute,
  clearQueue,
  className = ''
}: SpeechControlsProps) {
  const [showFullSentence, setShowFullSentence] = useState(false);
  
  // Display shortened sentence
  const displaySentence = currentSentence && currentSentence.length > 60 
    ? currentSentence.substring(0, 60) + '...'
    : currentSentence;

  const handleClose = () => {
    clearQueue();
  };

  return (
    <div className={`bg-white dark:bg-gray-800/50 backdrop-blur-sm rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700/30 p-4 ${className}`}>
      <div className="flex items-center gap-4">
        {/* Audio indicator */}
        <div className="flex items-center gap-2">
          <div className="relative w-8 h-8">
            <div className="absolute inset-0 bg-gradient-to-br from-[#22C55E] to-[#16A34A] rounded-full animate-pulse opacity-30"></div>
            <div className="relative w-full h-full bg-gradient-to-br from-[#22C55E] to-[#16A34A] rounded-full flex items-center justify-center">
              <svg className="w-4 h-4 text-white" fill="currentColor" viewBox="0 0 20 20">
                <path d="M9.653 16.915l-.005-.003-.019-.01a20.759 20.759 0 01-1.162-.682 22.045 22.045 0 01-2.582-1.9C4.045 12.733 2 10.352 2 7.5a4.5 4.5 0 018-2.828A4.5 4.5 0 0118 7.5c0 2.852-2.044 5.233-3.885 6.82a22.049 22.049 0 01-3.744 2.582l-.019.01-.005.003h-.002a.739.739 0 01-.69.001l-.002-.001z" />
              </svg>
            </div>
            {/* Pulsing rings animation */}
            <div className="absolute -inset-1">
              <div className="w-10 h-10 border-2 border-[#22C55E]/40 rounded-full animate-ping"></div>
            </div>
          </div>
          <span className="text-sm font-medium text-gray-600 dark:text-gray-400">Aria is speaking</span>
        </div>

        {/* Current sentence */}
        {currentSentence && (
          <div 
            className="flex-1 text-sm text-gray-700 dark:text-gray-300 truncate cursor-pointer"
            onClick={() => setShowFullSentence(!showFullSentence)}
            title={currentSentence}
          >
            {showFullSentence ? currentSentence : displaySentence}
          </div>
        )}

        {/* Queue indicator */}
        {queueLength > 0 && (
          <div className="px-2 py-1 bg-gray-100 dark:bg-gray-700/50 rounded-md">
            <span className="text-xs font-medium text-gray-600 dark:text-gray-400">
              +{queueLength} in queue
            </span>
          </div>
        )}

        {/* Single close button */}
        <button
          onClick={handleClose}
          className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700/50 rounded-lg transition-colors duration-150"
          title="Stop speech"
        >
          <svg className="w-5 h-5 text-gray-600 dark:text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>
    </div>
  );
}