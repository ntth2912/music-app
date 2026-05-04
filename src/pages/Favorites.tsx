import React, { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Heart, Music, Sparkles } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { toast } from '../lib/toast';
import SongHashtagChips, { type SongHashtag } from '../components/SongHashtagChips';
import SongCoverImage from '../components/SongCoverImage';
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
    <div className="p-8 min-h-screen bg-black pb-24">
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
        <div className="flex flex-col gap-1 mb-14">
          {songs.map((song, index) => (
            <div
              key={String(song.song_id)}
              role="button"
              tabIndex={0}
              onClick={() => navigate(`/song/${song.song_id}`)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault();
                  navigate(`/song/${song.song_id}`);
                }
              }}
              className="grid grid-cols-[30px_minmax(0,1.2fr)_minmax(0,1fr)_50px] gap-x-3 items-center p-3 hover:bg-white/5 rounded-lg group transition-all cursor-pointer"
            >
              <span className="text-gray-500 text-sm">{index + 1}</span>
              <div className="flex items-center gap-3 min-w-0">
                <SongCoverImage
                  song={song}
                  fallbackSrc={ROW_THUMB_FALLBACK}
                  className="w-10 h-10 rounded shadow-lg object-cover shrink-0"
                />
                <div className="min-w-0">
                  <span className="font-semibold truncate block text-white">{song.title}</span>
                  <SongHashtagChips hashtags={song.hashtags} maxVisible={2} dense className="mt-1" />
                </div>
              </div>
              <span className="text-gray-400 text-sm truncate">{song.artist ?? ''}</span>
              <button
                type="button"
                aria-label="Bỏ yêu thích"
                className="text-purple-500 hover:scale-110 transition-transform justify-self-end"
                onClick={(e) => {
                  e.stopPropagation();
                  handleToggleFavorite(Number(song.song_id));
                }}
              >
                <Heart size={20} className="fill-current" />
              </button>
            </div>
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
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-3 max-w-4xl">
              {discovery.map((song) => (
                <div
                  key={String(song.song_id)}
                  role="button"
                  tabIndex={0}
                  onClick={() => navigate(`/song/${song.song_id}`)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault();
                      navigate(`/song/${song.song_id}`);
                    }
                  }}
                  className="group rounded-md border border-white/5 bg-zinc-900 hover:bg-zinc-800 p-1.5 sm:p-2 cursor-pointer text-left transition-colors"
                >
                  <div className="relative aspect-square mb-1 rounded overflow-hidden">
                    <SongCoverImage
                      song={song}
                      fallbackSrc={ROW_THUMB_FALLBACK}
                      className="w-full h-full object-cover group-hover:scale-[1.02] transition-transform"
                    />
                  </div>
                  <h3 className="text-[10px] leading-tight line-clamp-2 font-medium text-white min-h-[2rem]">
                    {song.title}
                  </h3>
                  <p className="text-[9px] text-gray-400 truncate mt-0.5">
                    {song.artist ?? '—'}
                  </p>
                  <div className="mt-1 scale-75 origin-top-left min-h-[0.875rem]">
                    <SongHashtagChips hashtags={song.hashtags} maxVisible={1} dense />
                  </div>
                  <button
                    type="button"
                    title="Thêm vào yêu thích"
                    aria-label="Thêm vào yêu thích"
                    className="mt-1 p-1 text-gray-400 hover:text-red-500 hover:scale-110 transition-transform block"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleToggleFavorite(Number(song.song_id), true);
                    }}
                  >
                    <Heart className="w-3 h-3" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </section>
      )}
    </div>
  );
}
