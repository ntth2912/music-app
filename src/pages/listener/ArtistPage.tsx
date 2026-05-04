import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Heart, PlusCircle, Play, ArrowLeft, Music } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { toast } from '../../lib/toast';
import MusicPlayer from '../../components/MusicPlayer';
import {
  AddToPlaylistModal,
  usePlaylistAddFlow,
  usePlaybackQueue,
  toPlaybackSong,
} from '../../components/PlaylistPlayback';
import SongHashtagChips, { type SongHashtag } from '../../components/SongHashtagChips';
import SongCoverImage from '../../components/SongCoverImage';
import type { SongCoverFields } from '../../lib/songCover';

const API_BASE = 'http://localhost:5000/api/music';

const FALLBACK_COVER =
  'https://images.unsplash.com/photo-1493225255756-d9584f8606e9?w=300';
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

  const { playlists, modalSong, openPlaylistModal, closePlaylistModal } = usePlaylistAddFlow(
    API_BASE,
    user?.id ?? null,
  );
  const {
    currentSong,
    playTrackInList,
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
        <div className="max-w-screen-2xl mx-auto px-6 py-6">
          <p className="text-gray-400 text-sm leading-relaxed max-w-2xl">{artist.biography}</p>
        </div>
      )}

      {/* Songs */}
      <div className="max-w-screen-2xl mx-auto px-6 py-4">
        <h2 className="text-xl font-bold mb-6">Bài hát</h2>

        {songs.length === 0 ? (
          <div className="flex flex-col items-center gap-3 py-20 text-gray-500">
            <Music size={48} />
            <p>Chưa có bài hát nào</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {songs.map((song) => (
                <div
                  key={song.song_id}
                  onClick={() => navigate(`/song/${song.song_id}`)}
                  className="group p-4 rounded-2xl cursor-pointer transition-colors bg-zinc-900 hover:bg-zinc-800"
                >
                  <div className="relative aspect-square mb-4 overflow-hidden rounded-xl">
                    <SongCoverImage
                      song={song}
                      fallbackSrc={FALLBACK_COVER}
                      alt={song.title}
                      className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-[1.02]"
                    />
                  </div>

                  <h3 className="font-bold text-sm truncate">{song.title}</h3>
                  <p className="text-xs text-gray-400 truncate">
                    {song.artists && song.artists.length > 0
                      ? song.artists.map((a, i) => (
                          <React.Fragment key={a.artist_id}>
                            {i > 0 && ', '}
                            <span
                              className="hover:text-white cursor-pointer"
                              onClick={(e) => { e.stopPropagation(); navigate(`/artist/${a.artist_id}`); }}
                            >
                              {a.artist_name}
                            </span>
                          </React.Fragment>
                        ))
                      : (song.artist ?? 'Chưa xác định')}
                  </p>
                  <div className="mt-2 min-h-[1.25rem]">
                    <SongHashtagChips hashtags={song.hashtags} maxVisible={2} dense />
                  </div>

                  <div className="flex gap-2 mt-2">
                    <button
                      type="button"
                      title="Nghe trong hàng chờ"
                      onClick={(e) => {
                        e.stopPropagation();
                        const tracks = songs.map(toPlaybackSong);
                        playTrackInList(tracks, song.song_id);
                      }}
                    >
                      <Play className="w-5 h-5 text-gray-400 hover:text-white fill-current transition-colors" />
                    </button>
                    <button
                      type="button"
                      onClick={(e) => { e.stopPropagation(); handleToggleFavorite(Number(song.song_id)); }}
                      title="Yêu thích"
                    >
                      <Heart
                        className={`w-5 h-5 transition-colors ${
                          song.isFavorite ? 'text-red-500 fill-current' : 'text-gray-400 hover:text-white'
                        }`}
                      />
                    </button>
                    <button type="button" onClick={(e) => openPlaylistModal(e, song)} title="Thêm vào playlist">
                      <PlusCircle className="w-5 h-5 text-gray-400 hover:text-white transition-colors" />
                    </button>
                  </div>
                </div>
            ))}
          </div>
        )}
      </div>

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
