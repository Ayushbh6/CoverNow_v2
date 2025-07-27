'use client';

import { useState, useCallback, useRef, useEffect } from 'react';

interface AudioQueueItem {
  audio: HTMLAudioElement;
  sentence: string;
  timestamp: number;
}

interface UseSpeechControlsReturn {
  // State
  isPlaying: boolean;
  isPaused: boolean;
  isMuted: boolean;
  currentSentence: string | null;
  queueLength: number;
  
  // Controls
  playAudio: (base64Audio: string, sentence: string) => void;
  pauseAudio: () => void;
  resumeAudio: () => void;
  skipCurrent: () => void;
  toggleMute: () => void;
  clearQueue: () => void;
  
  // Settings
  speechEnabled: boolean;
  setSpeechEnabled: (enabled: boolean) => void;
}

// Base64 to Audio conversion
function base64ToAudioBlob(base64: string): Blob {
  const byteCharacters = atob(base64);
  const byteNumbers = new Array(byteCharacters.length);
  for (let i = 0; i < byteCharacters.length; i++) {
    byteNumbers[i] = byteCharacters.charCodeAt(i);
  }
  const byteArray = new Uint8Array(byteNumbers);
  return new Blob([byteArray], { type: 'audio/mp3' });
}

export function useSpeechControls(): UseSpeechControlsReturn {
  // State
  const [isPlaying, setIsPlaying] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [currentSentence, setCurrentSentence] = useState<string | null>(null);
  const [queueLength, setQueueLength] = useState(0);
  const [speechEnabled, setSpeechEnabledState] = useState(true);
  
  // Refs
  const audioQueueRef = useRef<AudioQueueItem[]>([]);
  const currentAudioRef = useRef<HTMLAudioElement | null>(null);
  const isProcessingRef = useRef<boolean>(false); // Track if we're currently processing queue
  
  // Load user preferences on mount
  useEffect(() => {
    const savedMuted = localStorage.getItem('covernow_speech_muted');
    const savedEnabled = localStorage.getItem('covernow_speech_enabled');
    
    if (savedMuted !== null) {
      setIsMuted(JSON.parse(savedMuted));
    }
    
    if (savedEnabled !== null) {
      setSpeechEnabledState(JSON.parse(savedEnabled));
    }
  }, []);
  
  // Save preferences
  const setSpeechEnabled = useCallback((enabled: boolean) => {
    setSpeechEnabledState(enabled);
    localStorage.setItem('covernow_speech_enabled', JSON.stringify(enabled));
  }, []);
  
  const toggleMute = useCallback(() => {
    const newMuted = !isMuted;
    setIsMuted(newMuted);
    localStorage.setItem('covernow_speech_muted', JSON.stringify(newMuted));
    
    // Apply mute to current audio
    if (currentAudioRef.current) {
      currentAudioRef.current.muted = newMuted;
    }
  }, [isMuted]);
  
  // Sequential playback logic
  const playNextInQueue = useCallback(() => {
    if (audioQueueRef.current.length === 0) {
      setIsPlaying(false);
      setCurrentSentence(null);
      setQueueLength(0);
      isProcessingRef.current = false; // No longer processing
      return;
    }
    
    isProcessingRef.current = true; // Mark as processing
    const { audio, sentence } = audioQueueRef.current.shift()!;
    setQueueLength(audioQueueRef.current.length);
    setIsPlaying(true);
    setIsPaused(false);
    setCurrentSentence(sentence);
    
    
    currentAudioRef.current = audio;
    audio.muted = isMuted;
    
    audio.onended = () => {
      URL.revokeObjectURL(audio.src);
      currentAudioRef.current = null;
      playNextInQueue(); // Continue to next
    };
    
    audio.onerror = () => {
      URL.revokeObjectURL(audio.src);
      currentAudioRef.current = null;
      playNextInQueue(); // Skip to next on error
    };
    
    audio.play().catch(() => {
      URL.revokeObjectURL(audio.src);
      currentAudioRef.current = null;
      playNextInQueue(); // Skip on play error
    });
  }, [isMuted]);
  
  // Add audio to queue
  const playAudio = useCallback((base64Audio: string, sentence: string) => {
    if (!speechEnabled) return;
    
    try {
      const audioBlob = base64ToAudioBlob(base64Audio);
      const audioUrl = URL.createObjectURL(audioBlob);
      const audio = new Audio();
      audio.src = audioUrl;
      audio.load();
      
      audioQueueRef.current.push({
        audio,
        sentence,
        timestamp: Date.now()
      });
      
      setQueueLength(audioQueueRef.current.length);
      
      
      // Only start playing if nothing is currently processing
      if (!isProcessingRef.current && !currentAudioRef.current) {
        playNextInQueue();
      }
    } catch (error) {
    }
  }, [speechEnabled, isPlaying, isPaused, playNextInQueue]);
  
  // Pause current audio
  const pauseAudio = useCallback(() => {
    if (currentAudioRef.current && isPlaying) {
      currentAudioRef.current.pause();
      setIsPaused(true);
      setIsPlaying(false);
    }
  }, [isPlaying]);
  
  // Resume current audio
  const resumeAudio = useCallback(() => {
    if (currentAudioRef.current && isPaused) {
      currentAudioRef.current.play().catch(() => {});
      setIsPaused(false);
      setIsPlaying(true);
    }
  }, [isPaused]);
  
  // Skip current audio
  const skipCurrent = useCallback(() => {
    if (currentAudioRef.current) {
      currentAudioRef.current.pause();
      const src = currentAudioRef.current.src;
      currentAudioRef.current = null;
      URL.revokeObjectURL(src);
      
      setIsPaused(false);
      playNextInQueue();
    }
  }, [playNextInQueue]);
  
  // Clear entire queue
  const clearQueue = useCallback(() => {
    // Stop current audio
    if (currentAudioRef.current) {
      currentAudioRef.current.pause();
      URL.revokeObjectURL(currentAudioRef.current.src);
      currentAudioRef.current = null;
    }
    
    // Clear queue and revoke all URLs
    audioQueueRef.current.forEach(item => {
      URL.revokeObjectURL(item.audio.src);
    });
    audioQueueRef.current = [];
    
    // Reset state
    setIsPlaying(false);
    setIsPaused(false);
    setCurrentSentence(null);
    setQueueLength(0);
    isProcessingRef.current = false; // Fix: Reset processing flag so future audio can play
  }, []);
  
  return {
    // State
    isPlaying,
    isPaused,
    isMuted,
    currentSentence,
    queueLength,
    
    // Controls
    playAudio,
    pauseAudio,
    resumeAudio,
    skipCurrent,
    toggleMute,
    clearQueue,
    
    // Settings
    speechEnabled,
    setSpeechEnabled,
  };
}