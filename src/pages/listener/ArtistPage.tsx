import { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Music, Sparkles } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { toast } from '../../lib/toast';
import MusicPlayer from '../../components/MusicPlayer';
import {
  AddToPlaylistModal,
  usePlaylistAddFlow,
  usePlaybackQueue,
} from '../../components/PlaylistPlayback';
import SongCard from '../../components/SongCard';
import { type SongHashtag } from '../../components/SongHashtagChips';
import type { SongCoverFields } from '../../lib/songCover';

const API_BASE = 'http://localhost:5000/api/music';

const FALLBACK_AVATAR =
  'https://images.unsplash.com/photo-1511367461989-f85a21fda167?w=600';

// ── Types ─────────────────────────────────────────────────────────────────────

interface ArtistInfo {
  artist_id: number;
  artist_name: string;
  biography?: string | null;
  avatar_url?: string | null;
}

interface SongArtist {
  artist_id: number;
  artist_name: string;
}

interface Song extends SongCoverFields {
  song_id: number;
  title: string;
  artist?: string;
  artists?: SongArtist[];
  duration?: number | null;
  like_count?: number;
  play_count?: number;
  isFavorite?: boolean;
  hashtags?: SongHashtag[];
}

function favoriteIdsFromResponse(data: unknown): Set<string> {
  if (!Array.isArray(data)) return new Set();
  const ids: string[] = [];
  for (const item of data) {
    if (item != null && typeof item === 'object') {
      const o = item as Record<string, unknown>;
      const id = o.songId ?? o.song_id ?? o.id;
      if (id != null) ids.push(String(id));
    } else if (item != null) {
      ids.push(String(item));
    }
  }
  return new Set(ids);
}

// ── Component ─────────────────────────────────────────────────────────────────

export default function ArtistPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();

  const [artist, setArtist] = useState<ArtistInfo | null>(null);
  const [songs, setSongs] = useState<Song[]>([]);
  const [loading, setLoading] = useState(true);
  const [suggestions, setSuggestions] = useState<Song[]>([]);
  const [loadingSuggestions, setLoadingSuggestions] = useState(false);

  const { playlists, modalSong, openPlaylistModal, closePlaylistModal } = usePlaylistAddFlow(
    API_BASE,
    user?.id ?? null,
  );
  const {
    currentSong,
    handleNext,
    handlePrevious,
  } = usePlaybackQueue();

  // ── Fetch data ─────────────────────────────────────────────────────────────

  useEffect(() => {
    if (!id) return;
    setLoading(true);

    const favPromise = user?.id
      ? fetch(`${API_BASE}/favorites/${user.id}`)
      : Promise.resolve(new Response('[]', { status: 200 }));

    Promise.all([
      fetch(`${API_BASE}/artists/${id}`),
      fetch(`${API_BASE}/artists/${id}/songs`),
      favPromise,
    ])
      .then(async ([artistRes, songsRes, favRes]) => {
        if (!artistRes.ok || !songsRes.ok) throw new Error();
        const [artistData, songList, favJson] = await Promise.all([
          artistRes.json(),
          songsRes.json(),
          favRes.ok ? favRes.json() : [],
        ]);
        const favSet = favoriteIdsFromResponse(favJson);
        setArtist(artistData);
        setSongs(
          (songList as Song[]).map((s) => ({
            ...s,
            isFavorite: favSet.has(String(s.song_id)),
          })),
        );
      })
      .catch(() => toast.error('Không thể tải thông tin ca sĩ'))
      .finally(() => setLoading(false));

    // Load "fan cũng hay nghe" suggestions
    setLoadingSuggestions(true);
    const userParam = user?.id ? `?userId=${encodeURIComponent(String(user.id))}` : '';
    fetch(`${API_BASE}/artists/${id}/suggestions${userParam}`)
      .then(async (res) => {
        const data = await res.json();
        if (Array.isArray(data)) setSuggestions(data);
      })
      .catch(() => {})
      .finally(() => setLoadingSuggestions(false));
  }, [id, user?.id]);

  // ── Favorite ───────────────────────────────────────────────────────────────

  const handleToggleFavorite = useCallback(
    async (songId: number) => {
      if (!user?.id) {
        toast.error('Chưa đăng nhập', {
          description: 'Hãy đăng nhập để dùng yêu thích.',
        });
        return;
      }
      setSongs((prev) =>
        prev.map((s) => (s.song_id === songId ? { ...s, isFavorite: !s.isFavorite } : s)),
      );
      try {
        const res = await fetch(`${API_BASE}/favorites/toggle`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ userId: user.id, songId }),
        });
        if (!res.ok) throw new Error();
        const result = (await res.json()) as { isFavorite?: boolean };
        const isFav = result.isFavorite ?? false;
        setSongs((prev) =>
          prev.map((s) => (s.song_id === songId ? { ...s, isFavorite: isFav } : s)),
        );
        toast.success(isFav ? 'Đã thêm vào yêu thích' : 'Đã xóa khỏi yêu thích');
      } catch {
        setSongs((prev) =>
          prev.map((s) => (s.song_id === songId ? { ...s, isFavorite: !s.isFavorite } : s)),
        );
        toast.error('Không thể cập nhật yêu thích');
      }
    },
    [user?.id],
  );

  const favRow =
    currentSong != null ? songs.find((s) => Number(s.song_id) === Number(currentSong.song_id)) : undefined;
  const isPlayerLiked = favRow?.isFavorite ?? false;

  // ── Render ─────────────────────────────────────────────────────────────────

  if (loading)
    return (
      <div className="min-h-screen bg-black text-white flex items-center justify-center">
        Đang tải...
      </div>
    );

  if (!artist)
    return (
      <div className="min-h-screen bg-black text-white flex flex-col items-center justify-center gap-4">
        <p className="text-gray-400">Không tìm thấy ca sĩ</p>
        <button onClick={() => navigate(-1)} className="text-purple-400 hover:text-white">
          ← Quay lại
        </button>
      </div>
    );

  const avatarSrc = artist.avatar_url || FALLBACK_AVATAR;

  return (
    <div className="min-h-screen bg-black text-white pb-36">

      {/* Hero */}
      <div className="relative h-72 overflow-hidden">
        <img
          src={avatarSrc}
          alt={artist.artist_name}
          onError={(e) => { (e.target as HTMLImageElement).src = FALLBACK_AVATAR; }}
          className="w-full h-full object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black via-black/50 to-transparent" />

        <button
          onClick={() => navigate(-1)}
          className="absolute top-4 left-4 p-2 bg-black/40 hover:bg-black/70 rounded-full transition-colors"
        >
          <ArrowLeft size={20} />
        </button>

        <div className="absolute bottom-6 left-6 flex items-end gap-5">
          <img
            src={avatarSrc}
            alt={artist.artist_name}
            onError={(e) => { (e.target as HTMLImageElement).src = FALLBACK_AVATAR; }}
            className="w-24 h-24 rounded-full object-cover border-2 border-white/20 shadow-xl"
          />
          <div>
            <p className="text-xs text-gray-300 uppercase tracking-widest mb-1">Ca sĩ</p>
            <h1 className="text-3xl font-bold">{artist.artist_name}</h1>
            <p className="text-sm text-gray-400 mt-1">{songs.length} bài hát</p>
          </div>
        </div>
      </div>

      {/* Biography */}
      {artist.biography && (
        <div className="max-w-4xl mx-auto px-8 py-6">
          <p className="text-gray-400 text-sm leading-relaxed max-w-2xl">{artist.biography}</p>
        </div>
      )}

      {/* Songs */}
      <div className="max-w-4xl mx-auto px-8 py-4">
        <h2 className="text-xl font-bold mb-6">Bài hát</h2>

        {songs.length === 0 ? (
          <div className="flex flex-col items-center gap-3 py-20 text-gray-500">
            <Music size={48} />
            <p>Chưa có bài hát nào</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {songs.map((song) => (
              <SongCard
                key={song.song_id}
                song={song}
                isFavorite={song.isFavorite}
                onToggleFavorite={() => handleToggleFavorite(Number(song.song_id))}
                onAddToPlaylist={(e) => openPlaylistModal(e, song)}
              />
            ))}
          </div>
        )}
      </div>

      {/* Suggestions: fan của ca sĩ này cũng hay nghe */}
      {(loadingSuggestions || suggestions.length > 0) && (
        <div className="max-w-4xl mx-auto px-8 pb-8">
          <div className="flex items-center gap-3 mb-6">
            <Sparkles className="w-6 h-6 text-amber-400 shrink-0" />
            <div>
              <h2 className="text-xl font-bold text-white">Fan cũng hay nghe</h2>
              <p className="text-sm text-gray-500 mt-0.5">
                Bài từ nghệ sĩ khác mà người nghe {artist.artist_name} thường yêu thích
              </p>
            </div>
          </div>
          {loadingSuggestions ? (
            <p className="text-gray-500 text-sm">Đang tải...</p>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {suggestions.map((song) => (
                <SongCard
                  key={song.song_id}
                  song={song}
                  isFavorite={song.isFavorite}
                  onToggleFavorite={() => handleToggleFavorite(Number(song.song_id))}
                  onAddToPlaylist={(e) => openPlaylistModal(e, song)}
                />
              ))}
            </div>
          )}
        </div>
      )}

      <AddToPlaylistModal
        song={modalSong}
        playlists={playlists}
        apiBase={API_BASE}
        onClose={closePlaylistModal}
      />

      <MusicPlayer
        currentSong={currentSong}
        onNext={handleNext}
        onPrevious={handlePrevious}
        onToggleLike={handleToggleFavorite}
        isLiked={isPlayerLiked}
      />
    </div>
  );
}
