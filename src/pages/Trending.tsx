import { useEffect, useState } from 'react';
import { TrendingUp, Sparkles } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import SongCard, { type SongCardSong } from '../components/SongCard';
import type { SongHashtag } from '../components/SongHashtagChips';
import type { SongCoverFields } from '../lib/songCover';

const API_BASE = 'http://localhost:5000/api/music';

interface Song extends SongCoverFields {
  song_id: number;
  title: string;
  artist?: string;
  play_count?: number;
  hashtags?: SongHashtag[];
}

export default function Trending() {
  const { user } = useAuth();
  const [songs, setSongs] = useState<Song[]>([]);
  const [suggestions, setSuggestions] = useState<Song[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingSuggestions, setLoadingSuggestions] = useState(false);

  useEffect(() => {
    let cancelled = false;
    fetch(`${API_BASE}/trending`)
      .then(async (res) => {
        const data = await res.json();
        if (cancelled) return;
        setSongs(res.ok && Array.isArray(data) ? data : []);
      })
      .catch(() => { if (!cancelled) setSongs([]); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, []);

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

  if (loading)
    return <div className="p-8 text-purple-500 bg-black min-h-screen">Đang tải xu hướng...</div>;

  return (
    <div className="p-8 bg-black min-h-screen pb-16">
      <div className="flex items-center gap-3 mb-8">
        <TrendingUp className="text-purple-500 w-8 h-8" />
        <h1 className="text-3xl font-bold text-white">Xu Hướng Hiện Nay</h1>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-14">
        {songs.length > 0 ? (
          songs.map((song, index) => (
            <SongCard
              key={song.song_id}
              song={song as SongCardSong}
              rankBadge={index + 1}
              showPlayCount
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
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {suggestions.map((song) => (
              <SongCard key={song.song_id} song={song as SongCardSong} showPlayCount />
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
