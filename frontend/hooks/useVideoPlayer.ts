import { useState, useCallback } from "react";

/**
 * Custom hook to manage video player state.
 * @returns {Object} - An object containing the playing state, a function to set the playing state, and a function to handle state changes.
 */
export function useVideoPlayer(): {
  playing: boolean;
  setPlaying: (value: boolean) => void;
  onStateChange: (state: string) => void;
} {
  const [playing, setPlaying] = useState(false);

  const onStateChange = useCallback((state: string) => {
    if (state === "ended") {
      setPlaying(false);
    }
  }, []);

  return { playing, setPlaying, onStateChange };
}
