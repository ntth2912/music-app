import React, {
  useState,
  useEffect,
  useRef,
  useCallback,
  type MouseEvent,
} from 'react';
import { Play, Pause, SkipBack, SkipForward, Volume2, VolumeX, Heart, X, Music, ListMusic } from 'lucide-react';
import { usePlaylist } from '../context/PlaylistContext';
import { toast } from '../lib/toast';
import { getSongItemImageSrc } from '../lib/songCover';

// ── Types ─────────────────────────────────────────────────────────────────────

export interface PlayerSong {
  song_id: string | number;
  title: string;
  artist?: string;
  file_url?: string | null;
  isFavorite?: boolean;
}

export interface PlaylistableSong {
  song_id: number;
  title: string;
  artist?: string;
}

const FALLBACK_COVER =
  'https://images.unsplash.com/photo-1493225255756-d9584f8606e9?w=300';

export function toPlaybackSong(song: {
  song_id: number;
  title: string;
  artist?: string | null;
  file_url?: string | null;
  isFavorite?: boolean;
  artists?: { artist_name: string }[];
}): PlayerSong {
  const artistLabel =
    song.artists?.length &&
    typeof song.artists[0]?.artist_name === 'string'
      ? song.artists.map((a) => a.artist_name).join(', ')
      : (song.artist ?? undefined);
  return {
    song_id: song.song_id,
    title: song.title,
    artist: artistLabel,
    file_url: song.file_url ?? null,
    isFavorite: song.isFavorite,
  };
}

// ── Add to playlist modal ──────────────────────────────────────────────────────

interface AddToPlaylistModalProps {
  song: PlaylistableSong | null;
  playlists: { id: number; name: string }[];
  apiBase: string;
  onClose: () => void;
}

export function AddToPlaylistModal({
  song,
  playlists,
  apiBase,
  onClose,
}: AddToPlaylistModalProps) {
  if (!song) return null;

  const pickPlaylist = async (playlistId: number) => {
    try {
      const res = await fetch(`${apiBase}/playlists/${playlistId}/songs`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ songId: song.song_id }),
      });
      if (!res.ok) throw new Error();
      const data = (await res.json()) as { alreadyExists?: boolean };
      if (data.alreadyExists) {
        toast.info('Bài hát đã có trong playlist');
      } else {
        toast.success('Đã thêm vào playlist');
      }
      onClose();
    } catch {
      toast.error('Không thể thêm vào playlist');
    }
  };

  return (
    <div
      className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center"
      onClick={onClose}
      role="presentation"
    >
      <div
        className="bg-zinc-900 border border-white/10 rounded-2xl p-6 w-80 max-h-[70vh] flex flex-col"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
      >
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-bold text-base">Thêm vào playlist</h3>
          <button type="button" onClick={onClose} className="text-gray-400 hover:text-white">
            <X size={18} />
          </button>
        </div>
        <p className="text-xs text-gray-400 truncate mb-4">
          {song.title}{song.artist ? ` — ${song.artist}` : ''}
        </p>
        <div className="overflow-y-auto flex-1 -mx-2">
          {playlists.length === 0 ? (
            <div className="flex flex-col items-center gap-2 py-8 text-gray-500">
              <Music size={32} />
              <p className="text-sm">Chưa có playlist nào</p>
            </div>
          ) : (
            playlists.map((pl) => (
              <button
                key={pl.id}
                type="button"
                onClick={() => pickPlaylist(pl.id)}
                className="w-full text-left px-4 py-3 rounded-xl hover:bg-zinc-800 transition-colors text-sm"
              >
                {pl.name}
              </button>
            ))
          )}
        </div>
      </div>
    </div>
  );
}

// ── Hook: mở modal thêm vào playlist ────────────────────────────────────────────

export function usePlaylistAddFlow(apiBase: string, userId: number | undefined | null) {
  const { playlists, fetchPlaylists } = usePlaylist();
  const [modalSong, setModalSong] = useState<PlaylistableSong | null>(null);

  useEffect(() => {
    if (userId) fetchPlaylists();
  }, [userId, fetchPlaylists]);

  const openPlaylistModal = useCallback(
    (e: MouseEvent, song: PlaylistableSong & { artists?: unknown }) => {
      e.stopPropagation();
      if (!userId) {
        toast.error('Chưa đăng nhập');
        return;
      }
      const artist =
        typeof song.artist === 'string'
          ? song.artist
          : Array.isArray(song.artists) && song.artists.length > 0
            ? song.artists
                .filter((x: unknown): x is { artist_name: string } =>
                  x != null && typeof x === 'object' &&
                  typeof (x as { artist_name?: string }).artist_name === 'string',
                )
                .map((a) => a.artist_name)
                .join(', ')
            : undefined;

      setModalSong({
        song_id: song.song_id,
        title: song.title,
        ...(artist !== undefined ? { artist } : {}),
      });
    },
    [userId],
  );

  const closePlaylistModal = useCallback(() => setModalSong(null), []);

  return { playlists, modalSong, openPlaylistModal, closePlaylistModal };
}

// ── Hook: hàng đợi phát — next / prev tại chỗ ───────────────────────────────────

export function usePlaybackQueue() {
  const [queue, setQueue] = useState<PlayerSong[]>([]);
  const [index, setIndex] = useState(-1);

  const currentSong = index >= 0 && index < queue.length ? queue[index] ?? null : null;

  const playIndexed = useCallback((newQueue: PlayerSong[], i: number) => {
    if (newQueue.length === 0) return;
    const safeIdx = Math.max(0, Math.min(i, newQueue.length - 1));
    setQueue(newQueue);
    setIndex(safeIdx);
  }, []);

  const playTrackInList = useCallback(
    (tracks: PlayerSong[], songId: number) => {
      const i = tracks.findIndex((t) => Number(t.song_id) === Number(songId));
      if (i < 0) return;
      playIndexed(tracks, i);
    },
    [playIndexed],
  );

  const handleNext = useCallback(() => {
    if (queue.length === 0) return;
    setIndex((prev) => (prev + 1) % queue.length);
  }, [queue.length]);

  const handlePrevious = useCallback(() => {
    if (queue.length === 0) return;
    setIndex((prev) => (prev - 1 + queue.length) % queue.length);
  }, [queue.length]);

  return {
    queue,
    index,
    currentSong,
    playIndexed,
    playTrackInList,
    handleNext,
    handlePrevious,
  };
}

function formatTime(sec: number): string {
  if (!isFinite(sec) || sec < 0) return '0:00';
  const m = Math.floor(sec / 60);
  const s = Math.floor(sec % 60);
  return `${m}:${s.toString().padStart(2, '0')}`;
}

// ── Thanh nghe nhạc: play / pause / next / prev (logic audio nằm gọn tại đây) ─

interface MusicPlayerProps {
  currentSong: PlayerSong | null;
  playKey?: number;
  onNext: () => void;
  onPrevious: () => void;
  onToggleLike: (songId: number) => void;
  isLiked: boolean;
  onToggleQueue?: () => void;
  isQueueOpen?: boolean;
}

export default function MusicPlayer({
  currentSong,
  playKey = 0,
  onNext,
  onPrevious,
  onToggleLike,
  isLiked,
  onToggleQueue,
  isQueueOpen = false,
}: MusicPlayerProps) {
  const audioRef = useRef<HTMLAudioElement>(null);
  const onNextRef = useRef(onNext);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(1);
  const [isMuted, setIsMuted] = useState(false);

  useEffect(() => {
    onNextRef.current = onNext;
  }, [onNext]);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    setCurrentTime(0);
    setDuration(0);
    setIsPlaying(false);

    const onTimeUpdate = () => setCurrentTime(audio.currentTime);
    const onDurationReady = () => {
      if (isFinite(audio.duration)) setDuration(audio.duration);
    };
    const onEnded = () => {
      setIsPlaying(false);
      onNextRef.current();
    };
    const onError = () => {
      setIsPlaying(false);
      const code = audio.error?.code ?? 0;
      if (code === MediaError.MEDIA_ERR_NETWORK || code === MediaError.MEDIA_ERR_SRC_NOT_SUPPORTED) {
        toast.error('Không tìm thấy file nhạc', {
          description: `File "${currentSong?.title}" không tồn tại trên server hoặc định dạng không hỗ trợ.`,
        });
      } else if (code === MediaError.MEDIA_ERR_DECODE) {
        toast.error('File nhạc bị lỗi', {
          description: `Không thể đọc file "${currentSong?.title}". File có thể bị hỏng.`,
        });
      }
    };

    audio.addEventListener('timeupdate', onTimeUpdate);
    audio.addEventListener('loadedmetadata', onDurationReady);
    audio.addEventListener('durationchange', onDurationReady);
    audio.addEventListener('ended', onEnded);
    audio.addEventListener('error', onError);

    if (currentSong?.file_url) {
      audio.src = currentSong.file_url;
      audio.load();
      audio.play().then(() => setIsPlaying(true)).catch(() => setIsPlaying(false));
    } else {
      audio.src = '';
    }

    return () => {
      audio.removeEventListener('timeupdate', onTimeUpdate);
      audio.removeEventListener('loadedmetadata', onDurationReady);
      audio.removeEventListener('durationchange', onDurationReady);
      audio.removeEventListener('ended', onEnded);
      audio.removeEventListener('error', onError);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentSong?.song_id, playKey]);

  const togglePlay = useCallback(() => {
    const audio = audioRef.current;
    if (!audio) return;
    if (isPlaying) {
      audio.pause();
      setIsPlaying(false);
    } else {
      audio.play().then(() => setIsPlaying(true)).catch(() => {});
    }
  }, [isPlaying]);

  const handleSeek = useCallback(
    (e: React.MouseEvent<HTMLDivElement>) => {
      const audio = audioRef.current;
      if (!audio || !duration) return;
      const rect = e.currentTarget.getBoundingClientRect();
      const ratio = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
      audio.currentTime = ratio * duration;
    },
    [duration],
  );

  const handleVolumeChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const vol = Number(e.target.value);
    setVolume(vol);
    setIsMuted(vol === 0);
    if (audioRef.current) audioRef.current.volume = vol;
  }, []);

  const toggleMute = useCallback(() => {
    const audio = audioRef.current;
    if (!audio) return;
    if (isMuted) {
      const v = volume || 1;
      audio.volume = v;
      setVolume(v);
      setIsMuted(false);
    } else {
      audio.volume = 0;
      setIsMuted(true);
    }
  }, [isMuted, volume]);

  if (!currentSong) return null;

  const progress = duration > 0 ? currentTime / duration : 0;
  const coverSrc = getSongItemImageSrc(currentSong, FALLBACK_COVER);

  return (
    <>
      <audio ref={audioRef} preload="metadata" />
      <div className="fixed bottom-0 left-0 right-0 bg-black/95 border-t border-white/10 p-4 z-50">
        <div className="max-w-screen-2xl mx-auto flex items-center justify-between gap-4">
          <div className="flex items-center gap-3 w-1/3 min-w-0">
            <img
              src={coverSrc}
              alt={currentSong.title}
              onError={(e) => {
                (e.target as HTMLImageElement).src = FALLBACK_COVER;
              }}
              className="w-14 h-14 rounded-lg object-cover shrink-0 shadow-lg shadow-purple-500/20"
            />
            <div className="min-w-0">
              <h4 className="font-bold text-sm truncate">{currentSong.title}</h4>
              <p className="text-xs text-gray-400 truncate">{currentSong.artist}</p>
            </div>
            <button
              type="button"
              onClick={() => onToggleLike(Number(currentSong.song_id))}
              className={`ml-2 shrink-0 p-2 hover:scale-110 transition-transform ${
                isLiked ? 'text-red-500' : 'text-gray-400 hover:text-white'
              }`}
            >
              <Heart size={18} fill={isLiked ? 'currentColor' : 'none'} />
            </button>
          </div>

          <div className="flex flex-col items-center w-1/3 gap-2">
            <div className="flex items-center gap-6">
              <button type="button" onClick={onPrevious} className="text-gray-400 hover:text-white transition-colors">
                <SkipBack size={22} />
              </button>
              <button
                type="button"
                onClick={togglePlay}
                className="w-10 h-10 bg-white text-black rounded-full flex items-center justify-center hover:scale-105 transition-transform"
              >
                {isPlaying ? <Pause size={18} fill="currentColor" /> : <Play size={18} fill="currentColor" />}
              </button>
              <button type="button" onClick={onNext} className="text-gray-400 hover:text-white transition-colors">
                <SkipForward size={22} />
              </button>
            </div>

            <div className="w-full flex items-center gap-2 text-xs text-gray-400">
              <span className="w-8 text-right tabular-nums">{formatTime(currentTime)}</span>
              <div
                role="presentation"
                className="flex-1 h-1 bg-white/10 rounded-full cursor-pointer group"
                onClick={handleSeek}
              >
                <div className="h-full bg-purple-500 rounded-full" style={{ width: `${progress * 100}%` }} />
              </div>
              <span className="w-8 tabular-nums">{formatTime(duration)}</span>
            </div>
          </div>

          <div className="flex items-center justify-end w-1/3 gap-3 text-gray-400">
            <button type="button" onClick={toggleMute} className="hover:text-white transition-colors">
              {isMuted || volume === 0 ? <VolumeX size={18} /> : <Volume2 size={18} />}
            </button>
            <input
              type="range"
              min={0}
              max={1}
              step={0.02}
              value={isMuted ? 0 : volume}
              onChange={handleVolumeChange}
              className="w-20 accent-purple-500 cursor-pointer"
              aria-label="Âm lượng"
            />
            {onToggleQueue && (
              <button
                type="button"
                onClick={onToggleQueue}
                title="Hàng đợi phát"
                className={`hover:text-white transition-colors ${isQueueOpen ? 'text-purple-400' : ''}`}
              >
                <ListMusic size={18} />
              </button>
            )}
          </div>
        </div>
      </div>
    </>
  );
}
