import { useState, useCallback } from "react";

export function useVideoPlayer() {
  const [playing, setPlaying] = useState(false);

  const onStateChange = useCallback((state: string) => {
    if (state === "ended") {
      setPlaying(false);
    }
  }, []);

  return { playing, setPlaying, onStateChange };
}
