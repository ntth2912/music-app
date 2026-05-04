import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { TrendingUp, Headset, Sparkles } from 'lucide-react';
import SongHashtagChips, { type SongHashtag } from '../components/SongHashtagChips';
import SongCoverImage from '../components/SongCoverImage';
import { useAuth } from '../context/AuthContext';
import type { SongCoverFields } from '../lib/songCover';

const API_BASE = 'http://localhost:5000/api/music';

interface Song extends SongCoverFields {
  song_id: number;
  title: string;
  artist?: string;
  play_count?: number;
  hashtags?: SongHashtag[];
}

const FALLBACK_COVER =
  'https://images.unsplash.com/photo-1470225620780-dba8ba36b745?w=300&h=300&fit=crop';

function SongCard(props: {
  song: Song;
  rankBadge?: number;
  onNavigate: (id: number) => void;
}) {
  const { song, rankBadge, onNavigate } = props;
  return (
    <div
      role="button"
      tabIndex={0}
      onClick={() => onNavigate(song.song_id)}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          onNavigate(song.song_id);
        }
      }}
      className="group bg-zinc-900/50 p-4 rounded-xl hover:bg-zinc-800 transition-all border border-white/5 relative cursor-pointer text-left"
    >
      <div className="relative aspect-square mb-4 overflow-hidden rounded-lg">
        <SongCoverImage
          song={song}
          fallbackSrc={FALLBACK_COVER}
          alt={song.title}
          className="object-cover w-full h-full group-hover:scale-110 transition-transform duration-500"
        />
        {rankBadge != null && (
          <div className="absolute top-2 left-2 bg-black/60 backdrop-blur-md px-2 py-1 rounded text-[10px] font-bold text-white">
            #{rankBadge}
          </div>
        )}
      </div>

      <h3 className="font-bold text-white truncate">{song.title}</h3>
      <p className="text-sm text-gray-400 truncate">{song.artist ?? ''}</p>
      <div className="mb-2 min-h-[1.125rem]">
        <SongHashtagChips hashtags={song.hashtags} maxVisible={2} dense />
      </div>

      <div className="flex items-center gap-2 text-[11px] text-purple-400 font-medium">
        <Headset size={14} />
        <span>{(song.play_count ?? 0).toLocaleString()} lượt nghe</span>
      </div>
    </div>
  );
}

export default function Trending() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [songs, setSongs] = useState<Song[]>([]);
  const [suggestions, setSuggestions] = useState<Song[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingSuggestions, setLoadingSuggestions] = useState(false);

  useEffect(() => {
    let cancelled = false;
    const fetchTrending = async () => {
      try {
        const response = await fetch(`${API_BASE}/trending`);
        const data = await response.json();
        if (cancelled) return;
        if (response.ok && Array.isArray(data)) {
          setSongs(data);
        } else {
          setSongs([]);
        }
      } catch {
        if (!cancelled) setSongs([]);
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    fetchTrending();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    const userId = user?.id ?? (user as { _id?: number } | null)?._id;
    if (!userId) {
      setSuggestions([]);
      return;
    }
    let cancelled = false;
    setLoadingSuggestions(true);
    fetch(`${API_BASE}/trending/suggestions?userId=${encodeURIComponent(String(userId))}`)
      .then(async (res) => {
        const data = await res.json();
        if (cancelled) return;
        if (res.ok && Array.isArray(data)) setSuggestions(data);
        else setSuggestions([]);
      })
      .catch(() => {
        if (!cancelled) setSuggestions([]);
      })
      .finally(() => {
        if (!cancelled) setLoadingSuggestions(false);
      });
    return () => {
      cancelled = true;
    };
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
        {Array.isArray(songs) && songs.length > 0 ? (
          songs.map((song, index) => (
            <SongCard
              key={song.song_id}
              song={song}
              rankBadge={index + 1}
              onNavigate={(id) => navigate(`/song/${id}`)}
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
              <SongCard key={song.song_id} song={song} onNavigate={(id) => navigate(`/song/${id}`)} />
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
