import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, Users, Music } from 'lucide-react';
import { toast } from '../../lib/toast';

const API_BASE = 'http://localhost:5000/api/music';

const FALLBACK_AVATAR =
  'https://images.unsplash.com/photo-1511367461989-f85a21fda167?w=600';

interface Artist {
  artist_id: number;
  artist_name: string;
  avatar_url?: string | null;
  biography?: string | null;
  song_count: number;
}

export default function ArtistsListPage() {
  const navigate = useNavigate();

  const [artists, setArtists] = useState<Artist[]>([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState('');
  const [debouncedQuery, setDebouncedQuery] = useState('');

  // Debounce search input 300ms
  useEffect(() => {
    const t = setTimeout(() => setDebouncedQuery(query), 300);
    return () => clearTimeout(t);
  }, [query]);

  const fetchArtists = useCallback((q: string) => {
    setLoading(true);
    const url = q
      ? `${API_BASE}/artists?q=${encodeURIComponent(q)}`
      : `${API_BASE}/artists`;
    fetch(url)
      .then((res) => {
        if (!res.ok) throw new Error();
        return res.json();
      })
      .then((data: Artist[]) => setArtists(data))
      .catch(() => toast.error('Không thể tải danh sách ca sĩ'))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    fetchArtists(debouncedQuery);
  }, [debouncedQuery, fetchArtists]);

  return (
    <div className="min-h-screen bg-black text-white pb-10">
      {/* Header */}
      <div className="sticky top-0 z-10 bg-black/90 backdrop-blur border-b border-white/10 px-8 py-4">
        <div className="max-w-4xl mx-auto flex flex-col sm:flex-row sm:items-center gap-4">
          <div className="flex items-center gap-3">
            <Users className="w-6 h-6 text-purple-400" />
            <h1 className="text-2xl font-bold">Ca Sĩ</h1>
            {!loading && (
              <span className="text-sm text-gray-500 font-normal">
                {artists.length} ca sĩ
              </span>
            )}
          </div>

          {/* Search */}
          <div className="relative sm:ml-auto w-full sm:w-72">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Tìm ca sĩ..."
              className="w-full pl-9 pr-4 py-2.5 rounded-xl bg-zinc-900 border border-white/10
                         text-sm text-white placeholder-gray-500 outline-none
                         focus:border-purple-500 focus:ring-1 focus:ring-purple-500 transition-colors"
            />
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-4xl mx-auto px-8 py-6">
        {loading ? (
          <div className="grid grid-cols-3 sm:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3">
            {Array.from({ length: 12 }).map((_, i) => (
              <div key={i} className="animate-pulse flex flex-col items-center gap-2 p-3 rounded-xl bg-zinc-900">
                <div className="w-16 h-16 rounded-full bg-zinc-700" />
                <div className="h-3 w-16 rounded bg-zinc-700" />
                <div className="h-2.5 w-12 rounded bg-zinc-800" />
              </div>
            ))}
          </div>
        ) : artists.length === 0 ? (
          <div className="flex flex-col items-center gap-3 py-24 text-gray-500">
            <Music size={48} />
            <p>
              {query
                ? `Không tìm thấy ca sĩ nào cho "${query}"`
                : 'Chưa có ca sĩ nào'}
            </p>
            {query && (
              <button
                onClick={() => setQuery('')}
                className="text-sm text-purple-400 hover:text-white transition-colors"
              >
                Xóa tìm kiếm
              </button>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-3 sm:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3">
            {artists.map((artist) => (
              <button
                key={artist.artist_id}
                type="button"
                onClick={() => navigate(`/artist/${artist.artist_id}`)}
                className="group flex flex-col items-center gap-2 p-3 rounded-xl
                           bg-zinc-900 hover:bg-zinc-800 transition-colors text-center"
              >
                <div className="w-16 h-16 shrink-0">
                  <img
                    src={artist.avatar_url || FALLBACK_AVATAR}
                    alt={artist.artist_name}
                    onError={(e) => {
                      (e.target as HTMLImageElement).src = FALLBACK_AVATAR;
                    }}
                    className="w-full h-full rounded-full object-cover
                               ring-2 ring-white/10 group-hover:ring-purple-500/50
                               transition-all duration-300 group-hover:scale-[1.04]"
                  />
                </div>

                <div className="w-full">
                  <p className="font-semibold text-xs truncate group-hover:text-purple-300 transition-colors">
                    {artist.artist_name}
                  </p>
                  <p className="text-[11px] text-gray-500 mt-0.5">
                    {artist.song_count} bài hát
                  </p>
                </div>
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
