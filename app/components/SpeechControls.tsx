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
  className = ''
}: SpeechControlsProps) {
  const [showFullSentence, setShowFullSentence] = useState(false);
  
  // Display shortened sentence
  const displaySentence = currentSentence && currentSentence.length > 60 
    ? currentSentence.substring(0, 60) + '...'
    : currentSentence;

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
          <span className="text-sm font-medium text-gray-600 dark:text-gray-400">Speaking</span>
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

        {/* Control buttons */}
        <div className="flex items-center gap-2">
          {/* Pause/Resume button */}
          <button
            onClick={isPaused ? resumeAudio : pauseAudio}
            className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700/50 rounded-lg transition-colors duration-150"
            title={isPaused ? 'Resume' : 'Pause'}
          >
            {isPaused ? (
              <svg className="w-5 h-5 text-gray-600 dark:text-gray-400" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM9.555 7.168A1 1 0 008 8v4a1 1 0 001.555.832l3-2a1 1 0 000-1.664l-3-2z" clipRule="evenodd" />
              </svg>
            ) : (
              <svg className="w-5 h-5 text-gray-600 dark:text-gray-400" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zM7 8a1 1 0 012 0v4a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v4a1 1 0 102 0V8a1 1 0 00-1-1z" clipRule="evenodd" />
              </svg>
            )}
          </button>

          {/* Mute button */}
          <button
            onClick={toggleMute}
            className={`p-2 rounded-lg transition-colors duration-150 ${
              isMuted 
                ? 'bg-red-100 dark:bg-red-900/20 hover:bg-red-200 dark:hover:bg-red-900/30' 
                : 'hover:bg-gray-100 dark:hover:bg-gray-700/50'
            }`}
            title={isMuted ? 'Unmute' : 'Mute'}
          >
            {isMuted ? (
              <svg className="w-5 h-5 text-red-600 dark:text-red-400" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M9.383 3.076A1 1 0 0110 4v12a1 1 0 01-1.707.707L4.586 13H2a1 1 0 01-1-1V8a1 1 0 011-1h2.586l3.707-3.707a1 1 0 011.09-.217zM12.293 7.293a1 1 0 011.414 0L15 8.586l1.293-1.293a1 1 0 111.414 1.414L16.414 10l1.293 1.293a1 1 0 01-1.414 1.414L15 11.414l-1.293 1.293a1 1 0 01-1.414-1.414L13.586 10l-1.293-1.293a1 1 0 010-1.414z" clipRule="evenodd" />
              </svg>
            ) : (
              <svg className="w-5 h-5 text-gray-600 dark:text-gray-400" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M9.383 3.076A1 1 0 0110 4v12a1 1 0 01-1.707.707L4.586 13H2a1 1 0 01-1-1V8a1 1 0 011-1h2.586l3.707-3.707a1 1 0 011.09-.217zM14.657 2.929a1 1 0 011.414 0A9.972 9.972 0 0119 10a9.972 9.972 0 01-2.929 7.071 1 1 0 01-1.414-1.414A7.971 7.971 0 0017 10c0-2.21-.894-4.208-2.343-5.657a1 1 0 010-1.414zm-2.829 2.828a1 1 0 011.415 0A5.983 5.983 0 0115 10a5.984 5.984 0 01-1.757 4.243 1 1 0 01-1.415-1.415A3.984 3.984 0 0013 10a3.983 3.983 0 00-1.172-2.828 1 1 0 010-1.415z" clipRule="evenodd" />
              </svg>
            )}
          </button>

          {/* Skip button */}
          <button
            onClick={skipCurrent}
            className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700/50 rounded-lg transition-colors duration-150"
            title="Skip current"
            disabled={!isPlaying && !isPaused}
          >
            <svg className="w-5 h-5 text-gray-600 dark:text-gray-400" fill="currentColor" viewBox="0 0 20 20">
              <path d="M4.555 5.168A1 1 0 003 6v8a1 1 0 001.555.832L10 11.202V14a1 1 0 001.555.832l6-4a1 1 0 000-1.664l-6-4A1 1 0 0010 6v2.798l-5.445-3.63z" />
            </svg>
          </button>

          {/* Queue indicator */}
          {queueLength > 0 && (
            <div className="ml-2 px-2 py-1 bg-gray-100 dark:bg-gray-700/50 rounded-md">
              <span className="text-xs font-medium text-gray-600 dark:text-gray-400">
                +{queueLength} in queue
              </span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}