import React, { createContext, useContext, useState, useCallback } from 'react';
import { usePlaybackQueue } from '../components/MusicPlayer';
import type { PlayerSong } from '../components/MusicPlayer';
import musicService from '../services/musicService';
import { toast } from '../lib/toast';

export type LoopMode = 'none' | 'all' | 'one';
export type QueueType = 'playlist' | 'free';

function dedupeQueueKeepLatest(queue: PlayerSong[]): PlayerSong[] {
  const seen = new Set<number>();
  const out: PlayerSong[] = [];
  for (let i = queue.length - 1; i >= 0; i -= 1) {
    const s = queue[i];
    const id = Number(s?.song_id);
    if (!Number.isFinite(id)) continue;
    if (seen.has(id)) continue;
    seen.add(id);
    out.push(s);
  }
  out.reverse();
  return out;
}

function lastIndexOfSongId(queue: PlayerSong[], songId: number): number {
  for (let i = queue.length - 1; i >= 0; i -= 1) {
    if (Number(queue[i]?.song_id) === Number(songId)) return i;
  }
  return -1;
}

interface PlaybackContextType {
  queue: PlayerSong[];
  queueIndex: number;
  currentSong: PlayerSong | null;
  manualQueue: PlayerSong[];
  suggestions: PlayerSong[];
  loopMode: LoopMode;
  playKey: number;
  likedSongs: Set<number>;
  queueOpen: boolean;
  playIndexed: (tracks: PlayerSong[], idx: number) => void;
  playTrackInList: (tracks: PlayerSong[], songId: number) => void;
  addToQueue: (song: PlayerSong) => void;
  playFromManualQueue: (manualIdx: number) => void;
  playSuggestion: (idx: number) => void;
  setSuggestions: React.Dispatch<React.SetStateAction<PlayerSong[]>>;
  handleNext: () => void;
  handlePrevious: () => void;
  cycleLoop: () => void;
  toggleLike: (songId: number, userId: number) => Promise<void>;
  setQueueOpen: React.Dispatch<React.SetStateAction<boolean>>;
  stopPlayback: () => void;
}

const PlaybackContext = createContext<PlaybackContextType | null>(null);

export function PlaybackProvider({ children }: { children: React.ReactNode }) {
  const {
    queue,
    index: queueIndex,
    currentSong,
    playIndexed: _playIndexed,
    playTrackInList: _playTrackInList,
    handleNext: nextInQueue,
    handlePrevious: prevInQueue,
    stopPlayback,
  } = usePlaybackQueue();

  const [queueType, setQueueType] = useState<QueueType>('free');
  const [manualQueue, setManualQueue] = useState<PlayerSong[]>([]);
  const [suggestions, setSuggestions] = useState<PlayerSong[]>([]);
  const [loopMode, setLoopMode] = useState<LoopMode>('none');
  const [playKey, setPlayKey] = useState(0);
  const [likedSongs, setLikedSongs] = useState<Set<number>>(new Set());
  const [queueOpen, setQueueOpen] = useState(false);

  // Called from playlist pages → show full playlist in panel
  const playIndexed = useCallback(
    (tracks: PlayerSong[], idx: number) => {
      _playIndexed(tracks, idx);
      setQueueType('playlist');
      setManualQueue([]);
      setQueueOpen(false);
    },
    [_playIndexed],
  );

  // Called from SongCard → single/context play, show manual queue panel
  const playTrackInList = useCallback(
    (tracks: PlayerSong[], songId: number) => {
      _playTrackInList(tracks, songId);
      setQueueType('free');
      setManualQueue([]);
      setQueueOpen(true);
    },
    [_playTrackInList],
  );

  // Adds song to manual queue (visible in panel when queueType === 'free')
  const addToQueue = useCallback((song: PlayerSong) => {
    setManualQueue((prev) => [...prev, song]);
    setQueueOpen(true);
    toast.success(`Đã thêm "${song.title}" vào danh sách chờ`);
  }, []);

  // User clicks a suggestion → append to main queue and play it, keep manual queue intact
  const playSuggestion = useCallback(
    (idx: number) => {
      const song = suggestions[idx];
      if (!song) return;
      const nextQueue = dedupeQueueKeepLatest([...queue, song]);
      _playIndexed(nextQueue, nextQueue.length - 1);
      setQueueType('free');
      // manualQueue NOT cleared — user's queued songs still valid
      // App.tsx refetches suggestions when currentSong.song_id changes
    },
    [suggestions, queue, _playIndexed],
  );

  // User clicks a song in the manual queue panel → play it + keep songs after it queued
  const playFromManualQueue = useCallback(
    (manualIdx: number) => {
      const songsFromIdx = manualQueue.slice(manualIdx);
      if (songsFromIdx.length === 0) return;
      const targetId = Number(songsFromIdx[0]?.song_id);
      const nextQueue = dedupeQueueKeepLatest([...queue, ...songsFromIdx]);
      const nextIdx = lastIndexOfSongId(nextQueue, targetId);
      _playIndexed(nextQueue, Math.max(0, nextIdx)); // plays manualQueue[manualIdx]
      setQueueType('free');
      setManualQueue([]);
    },
    [manualQueue, queue, _playIndexed],
  );

  const handleNext = useCallback(() => {
    if (loopMode === 'one') { setPlayKey((k) => k + 1); return; }

    // When playing a playlist, finish the playlist first.
    if (queueType === 'playlist' && queueIndex < queue.length - 1) {
      nextInQueue();
      return;
    }

    // Otherwise (free mode OR end of playlist), pull from manual queue if any.
    if (manualQueue.length > 0) {
      const [nextSong, ...remaining] = manualQueue;
      setManualQueue(remaining);
      const nextQueue = dedupeQueueKeepLatest([...queue, nextSong]);
      _playIndexed(nextQueue, nextQueue.length - 1);
      setQueueType('free');
      return;
    }

    if (queueIndex >= queue.length - 1) {
      if (loopMode === 'none') {
        // Fallback: append first suggestion to main queue and play it
        if (suggestions.length > 0) {
          const nextQueue = dedupeQueueKeepLatest([...queue, suggestions[0]]);
          _playIndexed(nextQueue, nextQueue.length - 1);
          setQueueType('free');
          // App.tsx refetches suggestions on currentSong change
        }
        return;
      }
    }

    nextInQueue();
  }, [loopMode, queueType, queueIndex, queue, manualQueue, suggestions, nextInQueue, _playIndexed]);

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
      manualQueue,
      suggestions,
      loopMode,
      playKey,
      likedSongs,
      queueOpen,
      playIndexed,
      playTrackInList,
      addToQueue,
      playFromManualQueue,
      playSuggestion,
      setSuggestions,
      handleNext,
      handlePrevious,
      cycleLoop,
      toggleLike,
      setQueueOpen,
      stopPlayback,
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
