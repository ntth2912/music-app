import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, Heart, PlusCircle, Play, ListPlus } from 'lucide-react';
import SongCard from '../../components/SongCard';
import { useAuth } from '../../context/AuthContext';
import { usePlayback } from '../../context/PlaybackContext';
import { toast } from '../../lib/toast';
import {
  AddToPlaylistModal,
  usePlaylistAddFlow,
  toPlaybackSong,
} from '../../components/PlaylistPlayback';
import SongHashtagChips, { type SongHashtag } from '../../components/SongHashtagChips';
import SongCoverImage from '../../components/SongCoverImage';
import type { SongCoverFields } from '../../lib/songCover';

const API_BASE = 'http://localhost:5000/api/music';

interface SongArtist {
  artist_id: number;
  artist_name: string;
}

interface Song extends SongCoverFields {
  song_id: number;
  title: string;
  artist?: string;
  artists?: SongArtist[];
  album_id?: number | null;
  duration?: number | null;
  lyrics?: string | null;
  status?: string | null;
  is_new?: number | null;
  play_count?: number;
  like_count?: number;
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

function mergeFavoriteFlags(list: Song[], favSet: Set<string>): Song[] {
  return list.map((s) => ({ ...s, isFavorite: favSet.has(String(s.song_id)) }));
}

export default function DetailSong() {
  const navigate = useNavigate();
  const { songId: songIdParam } = useParams<{ songId: string }>();
  const songIdNum = Number(songIdParam);
  const { user } = useAuth();
  const { addToQueue, playIndexed } = usePlayback();

  const [song, setSong] = useState<Song | null>(null);
  const [suggestions, setSuggestions] = useState<Song[]>([]);
  const [loadingSong, setLoadingSong] = useState(true);
  const [loadingSuggestions, setLoadingSuggestions] = useState(false);

  const { playlists, modalSong, openPlaylistModal, closePlaylistModal } = usePlaylistAddFlow(
    API_BASE,
    user?.id ?? null,
  );

  useEffect(() => {
    if (!Number.isFinite(songIdNum) || songIdNum <= 0) {
      setLoadingSong(false);
      setSong(null);
      return;
    }

    let cancelled = false;

    const load = async () => {
      setLoadingSong(true);
      setSuggestions([]);
      try {
        const songRes = await fetch(`${API_BASE}/songs/${songIdNum}`);
        if (!songRes.ok) {
          if (songRes.status === 404) {
            if (!cancelled) setSong(null);
            return;
          }
          throw new Error();
        }
        const detail: Song = await songRes.json();

        const favRes = user?.id
          ? await fetch(`${API_BASE}/favorites/${user.id}`)
          : null;
        const favJson = favRes?.ok ? await favRes.json() : [];
        const favSet = favoriteIdsFromResponse(favJson);

        if (!cancelled) {
          setSong({ ...detail, isFavorite: favSet.has(String(detail.song_id)) });
        }

        setLoadingSuggestions(true);
        try {
          const userParam = user?.id ? `?userId=${encodeURIComponent(String(user.id))}` : '';
          const sugRes = await fetch(
            `${API_BASE}/songs/${songIdNum}/suggestions${userParam}`,
          );
          if (!sugRes.ok) throw new Error();
          const rawList: Song[] = (await sugRes.json()) || [];
          if (!cancelled) setSuggestions(mergeFavoriteFlags(rawList, favSet));
        } catch {
          if (!cancelled) {
            toast.error('Không tải được gợi ý', {
              description: 'Thử lại sau hoặc kiểm tra server.',
            });
            setSuggestions([]);
          }
        } finally {
          if (!cancelled) setLoadingSuggestions(false);
        }
      } catch {
        if (!cancelled) {
          toast.error('Không tải được bài hát');
          setSong(null);
        }
      } finally {
        if (!cancelled) setLoadingSong(false);
      }
    };

    void load();
    return () => {
      cancelled = true;
    };
  }, [songIdNum, user?.id]);

  const playMainQueueFromIndex = useCallback(
    (startSongId: number) => {
      if (!song) return;
      const queueTracks = [
        toPlaybackSong(song),
        ...suggestions.map(toPlaybackSong),
      ];
      const idx = queueTracks.findIndex((t) => Number(t.song_id) === Number(startSongId));
      if (idx >= 0) playIndexed(queueTracks, idx);
    },
    [song, suggestions, playIndexed],
  );

  const handleToggleFavorite = useCallback(
    async (targetSongId: number) => {
      if (!user?.id) {
        toast.error('Chưa đăng nhập', {
          description: 'Hãy đăng nhập để dùng yêu thích.',
        });
        return;
      }

      const toggleInSong = (prev: Song | null) =>
        prev?.song_id === targetSongId ? { ...prev, isFavorite: !prev.isFavorite } : prev;
      const toggleInList = (list: Song[]) =>
        list.map((s) =>
          s.song_id === targetSongId ? { ...s, isFavorite: !s.isFavorite } : s,
        );

      setSong(toggleInSong);
      setSuggestions(toggleInList);

      try {
        const res = await fetch(`${API_BASE}/favorites/toggle`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ userId: user.id, songId: targetSongId }),
        });
        if (!res.ok) throw new Error();
        const result = (await res.json()) as { isFavorite?: boolean };
        const isFav = result.isFavorite ?? false;
        setSong((prev) =>
          prev?.song_id === targetSongId ? { ...prev, isFavorite: isFav } : prev,
        );
        setSuggestions((prev) =>
          prev.map((s) => (s.song_id === targetSongId ? { ...s, isFavorite: isFav } : s)),
        );
        toast.success(isFav ? 'Đã thêm vào yêu thích' : 'Đã xóa khỏi yêu thích');
      } catch {
        setSong(toggleInSong);
        setSuggestions(toggleInList);
        toast.error('Không thể cập nhật yêu thích');
      }
    },
    [user?.id],
  );

  if (loadingSong) {
    return (
      <div className="min-h-screen bg-black text-white flex items-center justify-center">
        Đang tải...
      </div>
    );
  }

  if (!song) {
    return (
      <div className="min-h-screen bg-black text-white flex flex-col items-center justify-center gap-4">
        <p className="text-gray-400">Không tìm thấy bài hát.</p>
        <button
          type="button"
          onClick={() => navigate(-1)}
          className="text-purple-400 hover:text-purple-300"
        >
          Quay lại
        </button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black text-white pb-36">
      <div className="max-w-4xl mx-auto px-8 py-6">
        <button
          type="button"
          onClick={() => navigate(-1)}
          className="flex items-center gap-2 text-gray-400 hover:text-white mb-8 transition-colors"
        >
          <ArrowLeft className="w-5 h-5" />
          Quay lại
        </button>

        <div className="flex flex-col md:flex-row gap-8 mb-12">
          <div className="shrink-0 w-full md:w-72 aspect-square rounded-2xl overflow-hidden bg-zinc-900">
            <SongCoverImage song={song} className="w-full h-full object-cover" />
          </div>
          <div className="flex-1 min-w-0">
            <h1 className="text-3xl font-bold mb-2">{song.title}</h1>
            <p className="text-gray-400 mb-6">
              {song.artists && song.artists.length > 0
                ? song.artists.map((a, i) => (
                    <React.Fragment key={a.artist_id}>
                      {i > 0 && ', '}
                      <button
                        type="button"
                        className="hover:text-white transition-colors"
                        onClick={() => navigate(`/artist/${a.artist_id}`)}
                      >
                        {a.artist_name}
                      </button>
                    </React.Fragment>
                  ))
                : (song.artist ?? 'Chưa xác định')}
            </p>
            {(song.hashtags?.length ?? 0) > 0 ? (
              <div className="mb-6">
                <p className="text-xs uppercase tracking-wide text-gray-500 mb-2">Hashtag</p>
                <SongHashtagChips hashtags={song.hashtags} maxVisible={null} />
              </div>
            ) : (
              <p className="text-sm text-gray-600 mb-6">Chưa gắn hashtag.</p>
            )}
            {song.lyrics ? (
              <div className="rounded-xl bg-zinc-900 border border-white/10 p-4 max-h-48 overflow-y-auto text-sm text-gray-300 whitespace-pre-wrap">
                {song.lyrics}
              </div>
            ) : (
              <p className="text-sm text-gray-500">Chưa có lời bài hát.</p>
            )}
            <div className="flex flex-wrap gap-3 mt-6">
              <button
                type="button"
                disabled={!song.file_url}
                onClick={() => playMainQueueFromIndex(song.song_id)}
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-purple-600 hover:bg-purple-500 disabled:opacity-40 font-medium transition-colors"
              >
                <Play className="w-5 h-5 fill-current" />
                Phát nhạc
              </button>
              <button
                type="button"
                onClick={() => addToQueue(toPlaybackSong(song))}
                title="Thêm vào danh sách chờ"
                className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-zinc-800 hover:bg-zinc-700 border border-white/10 text-gray-100"
              >
                <ListPlus className="w-5 h-5 text-purple-400" />
                Thêm vào danh sách chờ
              </button>
              <button
                type="button"
                onClick={() => handleToggleFavorite(song.song_id)}
                title="Yêu thích"
                className="p-2.5 rounded-xl bg-zinc-800 hover:bg-zinc-700 border border-white/10"
              >
                <Heart
                  className={`w-6 h-6 ${
                    song.isFavorite ? 'text-red-500 fill-current' : 'text-gray-400'
                  }`}
                />
              </button>
              <button
                type="button"
                onClick={(e) => openPlaylistModal(e, song)}
                title="Thêm vào playlist"
                className="p-2.5 rounded-xl bg-zinc-800 hover:bg-zinc-700 border border-white/10"
              >
                <PlusCircle className="w-6 h-6 text-gray-400" />
              </button>
            </div>
          </div>
        </div>

        <section>
          <h2 className="text-xl font-bold mb-4">Người nghe bài này cũng nghe</h2>
          {loadingSuggestions ? (
            <p className="text-gray-500 text-sm">Đang tải gợi ý...</p>
          ) : suggestions.length === 0 ? (
            <p className="text-gray-500 text-sm">
              Chưa có dữ liệu nghe chung. Bài càng nhiều lượt nghe thì gợi ý càng chính xác hơn.
            </p>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {suggestions.map((s) => (
                <SongCard
                  key={s.song_id}
                  song={s}
                  isFavorite={s.isFavorite}
                  onToggleFavorite={() => handleToggleFavorite(s.song_id)}
                  onAddToPlaylist={(e) => openPlaylistModal(e, s)}
                />
              ))}
            </div>
          )}
        </section>
      </div>

      <AddToPlaylistModal
        song={modalSong}
        playlists={playlists}
        apiBase={API_BASE}
        onClose={closePlaylistModal}
      />

    </div>
  );
}
