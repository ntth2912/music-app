import React, { createContext, useContext, useState, useCallback } from 'react';
import { usePlaybackQueue } from '../components/MusicPlayer';
import type { PlayerSong } from '../components/MusicPlayer';
import musicService from '../services/musicService';
import { toast } from '../lib/toast';

export type LoopMode = 'none' | 'all' | 'one';

interface PlaybackContextType {
  queue: PlayerSong[];
  queueIndex: number;
  currentSong: PlayerSong | null;
  loopMode: LoopMode;
  playKey: number;
  likedSongs: Set<number>;
  queueOpen: boolean;
  playIndexed: (tracks: PlayerSong[], idx: number) => void;
  playTrackInList: (tracks: PlayerSong[], songId: number) => void;
  handleNext: () => void;
  handlePrevious: () => void;
  cycleLoop: () => void;
  toggleLike: (songId: number, userId: number) => Promise<void>;
  setQueueOpen: React.Dispatch<React.SetStateAction<boolean>>;
}

const PlaybackContext = createContext<PlaybackContextType | null>(null);

export function PlaybackProvider({ children }: { children: React.ReactNode }) {
  const {
    queue,
    index: queueIndex,
    currentSong,
    playIndexed: _playIndexed,
    playTrackInList,
    handleNext: nextInQueue,
    handlePrevious: prevInQueue,
  } = usePlaybackQueue();

  const [loopMode, setLoopMode] = useState<LoopMode>('none');
  const [playKey, setPlayKey] = useState(0);
  const [likedSongs, setLikedSongs] = useState<Set<number>>(new Set());
  const [queueOpen, setQueueOpen] = useState(false);

  const playIndexed = useCallback(
    (tracks: PlayerSong[], idx: number) => _playIndexed(tracks, idx),
    [_playIndexed],
  );

  const handleNext = useCallback(() => {
    if (loopMode === 'one') { setPlayKey((k) => k + 1); return; }
    if (loopMode === 'none' && queueIndex >= queue.length - 1) return;
    nextInQueue();
  }, [loopMode, queueIndex, queue.length, nextInQueue]);

  const handlePrevious = useCallback(() => {
    if (loopMode === 'one') { setPlayKey((k) => k + 1); return; }
    prevInQueue();
  }, [loopMode, prevInQueue]);

  const cycleLoop = useCallback(() => {
    setLoopMode((m) => m === 'none' ? 'all' : m === 'all' ? 'one' : 'none');
  }, []);

  const toggleLike = useCallback(async (songId: number, userId: number) => {
    try {
      const data = await musicService.toggleFavorite(userId, songId);
      setLikedSongs((prev) => {
        const next = new Set(prev);
        data.isFavorite ? next.add(songId) : next.delete(songId);
        return next;
      });
    } catch {
      toast.error('Không thể cập nhật yêu thích');
    }
  }, []);

  return (
    <PlaybackContext.Provider value={{
      queue,
      queueIndex,
      currentSong,
      loopMode,
      playKey,
      likedSongs,
      queueOpen,
      playIndexed,
      playTrackInList,
      handleNext,
      handlePrevious,
      cycleLoop,
      toggleLike,
      setQueueOpen,
    }}>
      {children}
    </PlaybackContext.Provider>
  );
}

export function usePlayback() {
  const ctx = useContext(PlaybackContext);
  if (!ctx) throw new Error('usePlayback must be used within PlaybackProvider');
  return ctx;
}
