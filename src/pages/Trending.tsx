import { useEffect, useState, useCallback } from 'react';
import { TrendingUp, Sparkles } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { toast } from '../lib/toast';
import SongCard, { type SongCardSong } from '../components/SongCard';
import { AddToPlaylistModal, usePlaylistAddFlow } from '../components/PlaylistPlayback';
import type { SongHashtag } from '../components/SongHashtagChips';
import type { SongCoverFields } from '../lib/songCover';

const API_BASE = 'http://localhost:5000/api/music';

interface Song extends SongCoverFields {
  song_id: number;
  title: string;
  artist?: string;
  artists?: { artist_id: number; artist_name: string }[];
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

export default function Trending() {
  const { user } = useAuth();
  const [songs, setSongs] = useState<Song[]>([]);
  const [suggestions, setSuggestions] = useState<Song[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingSuggestions, setLoadingSuggestions] = useState(false);

  const { playlists, modalSong, openPlaylistModal, closePlaylistModal } = usePlaylistAddFlow(
    API_BASE,
    user?.id ?? null,
  );

  // Load trending + favorites together
  useEffect(() => {
    let cancelled = false;
    const userId = user?.id;

    const favPromise = userId
      ? fetch(`${API_BASE}/favorites/${userId}`)
      : Promise.resolve(new Response('[]', { status: 200 }));

    Promise.all([fetch(`${API_BASE}/trending`), favPromise])
      .then(async ([trendRes, favRes]) => {
        if (cancelled) return;
        const [trendData, favJson] = await Promise.all([
          trendRes.json(),
          favRes.ok ? favRes.json() : [],
        ]);
        const favSet = favoriteIdsFromResponse(favJson);
        setSongs(
          (trendRes.ok && Array.isArray(trendData) ? trendData : []).map((s: Song) => ({
            ...s,
            isFavorite: favSet.has(String(s.song_id)),
          })),
        );
      })
      .catch(() => { if (!cancelled) setSongs([]); })
      .finally(() => { if (!cancelled) setLoading(false); });

    return () => { cancelled = true; };
  }, [user?.id]);

  // Load suggestions
  useEffect(() => {
    const userId = user?.id ?? (user as { _id?: number } | null)?._id;
    if (!userId) { setSuggestions([]); return; }
    let cancelled = false;
    setLoadingSuggestions(true);
    fetch(`${API_BASE}/trending/suggestions?userId=${encodeURIComponent(String(userId))}`)
      .then(async (res) => {
        const data = await res.json();
        if (cancelled) return;
        setSuggestions(res.ok && Array.isArray(data) ? data : []);
      })
      .catch(() => { if (!cancelled) setSuggestions([]); })
      .finally(() => { if (!cancelled) setLoadingSuggestions(false); });
    return () => { cancelled = true; };
  }, [user]);

  const handleToggleFavorite = useCallback(async (songId: number) => {
    if (!user?.id) {
      toast.error('Chưa đăng nhập', { description: 'Hãy đăng nhập để dùng yêu thích.' });
      return;
    }
    const optimistic = (list: Song[]) =>
      list.map((s) => s.song_id === songId ? { ...s, isFavorite: !s.isFavorite } : s);
    setSongs(optimistic);
    setSuggestions(optimistic);
    try {
      const res = await fetch(`${API_BASE}/favorites/toggle`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: user.id, songId }),
      });
      if (!res.ok) throw new Error();
      const result = (await res.json()) as { isFavorite?: boolean };
      const isFav = result.isFavorite ?? false;
      const confirm = (list: Song[]) =>
        list.map((s) => s.song_id === songId ? { ...s, isFavorite: isFav } : s);
      setSongs(confirm);
      setSuggestions(confirm);
      toast.success(isFav ? 'Đã thêm vào yêu thích' : 'Đã xóa khỏi yêu thích');
    } catch {
      setSongs(optimistic);
      setSuggestions(optimistic);
      toast.error('Không thể cập nhật yêu thích');
    }
  }, [user?.id]);

  if (loading)
    return <div className="p-8 text-purple-500 bg-black min-h-screen">Đang tải xu hướng...</div>;

  return (
    <div className="bg-black min-h-screen pb-16">
      <div className="max-w-4xl mx-auto px-8 py-6">

        <div className="flex items-center gap-3 mb-8">
          <TrendingUp className="text-purple-500 w-8 h-8" />
          <h1 className="text-3xl font-bold text-white">Xu Hướng Hiện Nay</h1>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-14">
          {songs.length > 0 ? (
            songs.map((song, index) => (
              <SongCard
                key={song.song_id}
                song={song as SongCardSong}
                rankBadge={index + 1}
                showPlayCount
                isFavorite={song.isFavorite}
                onToggleFavorite={() => handleToggleFavorite(song.song_id)}
                onAddToPlaylist={(e) => openPlaylistModal(e, song)}
              />
            ))
          ) : (
            <div className="text-gray-500 col-span-full text-center py-20">
              Chưa có dữ liệu xu hướng âm nhạc.
            </div>
          )}
        </div>

        <section aria-labelledby="trend-suggestions-heading">
          <div className="flex items-center gap-3 mb-6">
            <Sparkles className="text-amber-400 w-7 h-7 shrink-0" />
            <div>
              <h2 id="trend-suggestions-heading" className="text-xl font-bold text-white">
                Gợi ý từ ca sĩ bạn thích
              </h2>
              <p className="text-sm text-gray-500 mt-0.5">
                Bài cùng nghệ sĩ trong thư viện yêu thích — chưa lưu tim; xếp theo điểm kết hợp lượt nghe và lượt thích
              </p>
            </div>
          </div>

          {!user?.id && !(user as { _id?: number } | null)?._id ? (
            <p className="text-gray-500 text-sm">Đăng nhập để nhận gợi ý cá nhân.</p>
          ) : loadingSuggestions ? (
            <p className="text-gray-500 text-sm">Đang tải gợi ý...</p>
          ) : suggestions.length === 0 ? (
            <p className="text-gray-500 text-sm">
              Chưa có gợi ý. Thử thêm bài vào yêu thích có gắn ca sĩ để xem các bài khác của họ.
            </p>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {suggestions.map((song) => (
                <SongCard
                  key={song.song_id}
                  song={song as SongCardSong}
                  showPlayCount
                  isFavorite={song.isFavorite}
                  onToggleFavorite={() => handleToggleFavorite(song.song_id)}
                  onAddToPlaylist={(e) => openPlaylistModal(e, song)}
                />
              ))}
            </div>
          )}
        </section>

        <AddToPlaylistModal
          song={modalSong}
          playlists={playlists}
          apiBase={API_BASE}
          onClose={closePlaylistModal}
        />
      </div>
    </div>
  );
}
