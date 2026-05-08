import React, { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Heart, Music, Sparkles } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { toast } from '../lib/toast';
import SongCard, { type SongCardSong } from '../components/SongCard';
import { AddToPlaylistModal, usePlaylistAddFlow } from '../components/PlaylistPlayback';
import type { SongHashtag } from '../components/SongHashtagChips';
import type { SongCoverFields } from '../lib/songCover';

const API_BASE = 'http://localhost:5000/api/music';

const ROW_THUMB_FALLBACK =
  'https://images.unsplash.com/photo-1493225255756-d9584f8606e9?w=300';

interface FavoriteSong extends SongCoverFields {
  song_id: number | string;
  title: string;
  artist?: string;
  artists?: { artist_id: number; artist_name: string }[];
  hashtags?: SongHashtag[];
}

function numericUserId(user: ReturnType<typeof useAuth>['user']) {
  return user?.id ?? (user as { _id?: number } | undefined)?._id;
}

export default function Favorites() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [songs, setSongs] = useState<FavoriteSong[]>([]);
  const [discovery, setDiscovery] = useState<FavoriteSong[]>([]);
  const [loading, setLoading] = useState(true);

  const { playlists, modalSong, openPlaylistModal, closePlaylistModal } = usePlaylistAddFlow(
    API_BASE,
    numericUserId(user) ?? null,
  );

  const fetchLibrary = useCallback(async () => {
    const userId = numericUserId(user);
    if (userId === undefined || userId === null) {
      setSongs([]);
      setDiscovery([]);
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      const [favRes, discRes] = await Promise.all([
        fetch(`${API_BASE}/favorites/${userId}`),
        fetch(
          `${API_BASE}/favorites/discovery/${userId}?limit=${encodeURIComponent('8')}`,
        ),
      ]);
      const favData = favRes.ok ? await favRes.json() : [];
      const discData = discRes.ok ? await discRes.json() : [];

      setSongs(Array.isArray(favData) ? favData : []);
      setDiscovery(Array.isArray(discData) ? discData : []);
    } catch {
      console.error('Lỗi đồng bộ yêu thích');
      setSongs([]);
      setDiscovery([]);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    fetchLibrary();
  }, [fetchLibrary]);

  const handleToggleFavorite = async (songId: number, fromDiscovery?: boolean) => {
    const uid = numericUserId(user);
    if (uid == null) {
      toast.error('Chưa đăng nhập', {
        description: 'Hãy đăng nhập để quản lý yêu thích.',
      });
      return;
    }

    try {
      const response = await fetch(`${API_BASE}/favorites/toggle`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: uid, songId }),
      });
      if (!response.ok) throw new Error('Toggle failed');

      const result = (await response.json()) as { isFavorite?: boolean };

      if (result.isFavorite === false) {
        setSongs((prev) =>
          prev.filter((s) => Number(s.song_id) !== songId),
        );
        setDiscovery((prev) => prev.filter((s) => Number(s.song_id) !== songId));
        toast.success('Đã bỏ yêu thích', {
          description: 'Bài hát đã được gỡ khỏi danh sách yêu thích.',
        });
        await fetchLibrary();
      } else if (result.isFavorite === true) {
        if (fromDiscovery) {
          setDiscovery((prev) => prev.filter((s) => Number(s.song_id) !== songId));
          await fetchLibrary();
        }
        toast.success('Đã thêm vào yêu thích', {
          description: 'Bài hát đã được lưu vào danh sách yêu thích.',
        });
      }
    } catch {
      toast.error('Không thể cập nhật yêu thích', {
        description: 'Thử lại sau hoặc kiểm tra kết nối server.',
      });
    }
  };

  if (loading) return <div className="p-8 text-purple-500">Đang đồng bộ thư viện...</div>;

  return (
    <div className="min-h-screen bg-black pb-24">
      <div className="max-w-4xl mx-auto px-8 py-6">
      <div className="flex items-center gap-6 mb-10">
        <div className="w-48 h-48 bg-gradient-to-br from-indigo-600 to-purple-700 rounded-lg flex items-center justify-center shadow-2xl shrink-0">
          <Heart size={80} className="fill-white text-white" />
        </div>
        <div>
          <h1 className="text-4xl md:text-6xl font-black text-white">Bài hát đã thích</h1>
          <p className="text-gray-400 mt-4 font-bold">
            {songs.length} bài hát đã được lưu vào thư viện
          </p>
        </div>
      </div>

      {songs.length === 0 ? (
        <div className="text-center py-20 bg-zinc-900/20 rounded-3xl border border-dashed border-zinc-800 mb-10">
          <Music className="mx-auto mb-4 text-zinc-700" size={48} />
          <p className="text-zinc-500">
            Thư viện đang trống. Hãy quay lại trang chủ và nhấn Tim nhé!
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-14">
          {songs.map((song) => (
            <SongCard
              key={String(song.song_id)}
              song={song as unknown as SongCardSong}
              contextSongs={songs as unknown as SongCardSong[]}
              isFavorite
              onToggleFavorite={() => handleToggleFavorite(Number(song.song_id))}
              onAddToPlaylist={(e) => openPlaylistModal(e, song as unknown as SongCardSong)}
              showPlayCount={false}
            />
          ))}
        </div>
      )}

      {numericUserId(user) != null && songs.length > 0 && (
        <section aria-labelledby="favorites-discovery-heading">
          <div className="flex items-center gap-3 mb-4">
            <Sparkles className="text-cyan-400 w-7 h-7 shrink-0" />
            <div>
              <h2 id="favorites-discovery-heading" className="text-xl font-bold text-white">
                Khám phá thêm
              </h2>
              <p className="text-sm text-gray-500 mt-0.5 max-w-3xl">
                Bài chưa lưu tim: không có hashtag, hoặc có tag chưa từng trong bài đã thích, hoặc không có ca sĩ
                trùng với thư viện của bạn. Xếp theo điểm nghe và tim.
              </p>
            </div>
          </div>

          {discovery.length === 0 ? (
            <p className="text-gray-500 text-sm">
              Hiện chưa có bài khớp điều kiện. Thử thêm hashtag/ca sĩ vào bài thích để mở rộng gợi ý.
            </p>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {discovery.map((song) => (
                <SongCard
                  key={String(song.song_id)}
                  song={song as unknown as SongCardSong}
                  contextSongs={discovery as unknown as SongCardSong[]}
                  isFavorite={false}
                  onToggleFavorite={() => handleToggleFavorite(Number(song.song_id), true)}
                  onAddToPlaylist={(e) => openPlaylistModal(e, song as unknown as SongCardSong)}
                  showPlayCount={false}
                />
              ))}
            </div>
          )}
        </section>
      )}
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
