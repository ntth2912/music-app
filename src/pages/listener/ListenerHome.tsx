import { useState, useEffect, useCallback, useRef } from 'react';
import useEmblaCarousel from 'embla-carousel-react';
import { Search, Sparkles, ChevronLeft, ChevronRight } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { toast } from '../../lib/toast';
import { AddToPlaylistModal, usePlaylistAddFlow } from '../../components/PlaylistPlayback';
import type { SongHashtag } from '../../components/SongHashtagChips';
import type { SongCoverFields } from '../../lib/songCover';
import SongCard from '../../components/SongCard';

const API_BASE = 'http://localhost:5000/api/music';
const PAGE_SIZE = 8;

// ── Types ─────────────────────────────────────────────────────────────────────

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

interface PaginatedSongsResponse {
  items: Song[];
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
}

function isPaginatedSongsResponse(x: unknown): x is PaginatedSongsResponse {
  return (
    x != null &&
    typeof x === 'object' &&
    Array.isArray((x as PaginatedSongsResponse).items) &&
    typeof (x as PaginatedSongsResponse).totalPages === 'number'
  );
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

function mergeFavoriteFlags<T extends Song>(list: T[], favSet: Set<string>): T[] {
  return list.map((s) => ({ ...s, isFavorite: favSet.has(String(s.song_id)) }));
}

// ── Component ─────────────────────────────────────────────────────────────────

export default function ListenerHome() {
  const { user } = useAuth();

  const [songPagesLoaded, setSongPagesLoaded] = useState<Record<number, Song[]>>({});
  const [totalSongPages, setTotalSongPages] = useState(1);
  const [swiperIndex, setSwiperIndex] = useState(0);
  const [loading, setLoading] = useState(true);
  const [pagesInFlight, setPagesInFlight] = useState<Record<number, boolean>>({});
  const [homeSuggestions, setHomeSuggestions] = useState<Song[]>([]);
  const [searchQuery, setSearchQuery] = useState('');

  const favSetRef = useRef<Set<string>>(new Set());
  const songPagesLoadedRef = useRef<Record<number, Song[]>>({});
  const totalSongPagesRef = useRef(1);
  const pagesInFlightRef = useRef<Set<number>>(new Set());

  useEffect(() => {
    songPagesLoadedRef.current = songPagesLoaded;
  }, [songPagesLoaded]);

  useEffect(() => {
    totalSongPagesRef.current = totalSongPages;
  }, [totalSongPages]);

  const [emblaRef, emblaApi] = useEmblaCarousel({
    axis: 'x',
    loop: false,
    align: 'start',
    containScroll: 'trimSnaps',
  });

  const { playlists, modalSong, openPlaylistModal, closePlaylistModal } = usePlaylistAddFlow(
    API_BASE,
    user?.id ?? null,
  );

  const upsertFavoriteOnAllPages = useCallback(
    (songId: number, isFavorite: boolean) => {
      setSongPagesLoaded((prev) => {
        const next = { ...prev };
        for (const key of Object.keys(next)) {
          const n = Number(key);
          next[n] = next[n].map((s) =>
            s.song_id === songId ? { ...s, isFavorite } : s,
          );
        }
        return next;
      });
    },
    [],
  );

  const fetchSongPage = useCallback(
    async (
      pageNum: number,
      favSetForMerge: Set<string>,
    ): Promise<{ page: number; totalPages: number; items: Song[] } | null> => {
      const params = new URLSearchParams();
      params.set('page', String(pageNum));
      params.set('limit', String(PAGE_SIZE));
      const qTrim = searchQuery.trim();
      if (qTrim) params.set('q', qTrim.normalize('NFC'));

      const res = await fetch(`${API_BASE}/songs?${params.toString()}`);
      if (!res.ok) return null;
      const data: unknown = await res.json();
      if (!isPaginatedSongsResponse(data)) return null;

      const items = mergeFavoriteFlags(data.items, favSetForMerge);
      return { page: data.page, totalPages: Math.max(1, data.totalPages), items };
    },
    [searchQuery],
  );

  const loadSongPageIfNeeded = useCallback(async (pageNum: number) => {
    if (pageNum < 1 || pageNum > totalSongPagesRef.current) return;
    if (songPagesLoadedRef.current[pageNum]) return;
    if (pagesInFlightRef.current.has(pageNum)) return;

    pagesInFlightRef.current.add(pageNum);
    setPagesInFlight((p) => ({ ...p, [pageNum]: true }));
    try {
      const result = await fetchSongPage(pageNum, favSetRef.current);
      if (result) {
        setSongPagesLoaded((prev) => ({ ...prev, [pageNum]: result.items }));
      }
    } catch {
      toast.error('Không tải được trang bài hát');
    } finally {
      pagesInFlightRef.current.delete(pageNum);
      setPagesInFlight((p) => {
        const n = { ...p };
        delete n[pageNum];
        return n;
      });
    }
  }, [fetchSongPage]);

  const reloadFeed = useCallback(async () => {
    try {
      setLoading(true);
      const qTrim = searchQuery.trim();
      const params = new URLSearchParams();
      params.set('page', '1');
      params.set('limit', String(PAGE_SIZE));
      if (qTrim) params.set('q', qTrim.normalize('NFC'));

      const userIdNumeric = Number(user?.id ?? (user as { _id?: number } | undefined)?._id);

      const suggestionsUrl =
        Number.isFinite(userIdNumeric) && userIdNumeric > 0
          ? `${API_BASE}/home/suggestions?userId=${encodeURIComponent(String(userIdNumeric))}`
          : `${API_BASE}/home/suggestions`;

      const [songsRes, favRes, sugRes] = await Promise.all([
        fetch(`${API_BASE}/songs?${params.toString()}`),
        Number.isFinite(userIdNumeric) && userIdNumeric > 0
          ? fetch(`${API_BASE}/favorites/${userIdNumeric}`)
          : Promise.resolve(new Response('[]', { status: 200 })),
        fetch(suggestionsUrl),
      ]);

      if (!songsRes.ok) throw new Error();

      const rawSongs: unknown = await songsRes.json();
      if (!isPaginatedSongsResponse(rawSongs)) throw new Error();

      const favJson = favRes.ok ? await favRes.json() : [];
      const favSet = favoriteIdsFromResponse(favJson);
      favSetRef.current = favSet;

      const totalPg = Math.max(1, rawSongs.totalPages);
      const page1 = mergeFavoriteFlags(rawSongs.items, favSet);
      setTotalSongPages(totalPg);
      setSongPagesLoaded({ 1: page1 });
      songPagesLoadedRef.current = { 1: page1 };
      totalSongPagesRef.current = totalPg;
      setSwiperIndex(0);

      const sugJson = sugRes.ok ? await sugRes.json() : [];
      setHomeSuggestions(
        Array.isArray(sugJson) ? mergeFavoriteFlags(sugJson as Song[], favSet) : [],
      );
    } catch {
      toast.error('Không thể kết nối đến server', {
        description: 'Thử lại sau hoặc kiểm tra kết nối server.',
      });
      const emptyPages: Record<number, Song[]> = {};
      setSongPagesLoaded(emptyPages);
      songPagesLoadedRef.current = emptyPages;
      setTotalSongPages(1);
      totalSongPagesRef.current = 1;
      setHomeSuggestions([]);
    } finally {
      setLoading(false);
    }
  }, [searchQuery, user?.id, (user as { _id?: number } | undefined)?._id]);

  useEffect(() => {
    const timer = setTimeout(reloadFeed, 400);
    return () => clearTimeout(timer);
  }, [reloadFeed]);

  useEffect(() => {
    if (!emblaApi) return;
    const raf = requestAnimationFrame(() => {
      emblaApi.reInit();
      emblaApi.scrollTo(0);
    });
    return () => cancelAnimationFrame(raf);
  }, [emblaApi, totalSongPages, searchQuery]);

  useEffect(() => {
    if (!emblaApi) return;
    const onSelect = () => {
      const i = emblaApi.selectedScrollSnap();
      setSwiperIndex(i);
      void loadSongPageIfNeeded(i + 1);
    };
    emblaApi.on('select', onSelect);
    onSelect();
    return () => { emblaApi.off('select', onSelect); };
  }, [emblaApi, loadSongPageIfNeeded]);

  const handleToggleFavorite = useCallback(
    async (songId: number) => {
      if (!user?.id) {
        toast.error('Chưa đăng nhập', { description: 'Hãy đăng nhập để dùng yêu thích.' });
        return;
      }

      setSongPagesLoaded((prev) => {
        const next = { ...prev };
        for (const key of Object.keys(next)) {
          const n = Number(key);
          next[n] = next[n].map((s) =>
            s.song_id === songId ? { ...s, isFavorite: !s.isFavorite } : s,
          );
        }
        return next;
      });
      setHomeSuggestions((prev) =>
        prev.map((s) => s.song_id === songId ? { ...s, isFavorite: !s.isFavorite } : s),
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
        upsertFavoriteOnAllPages(songId, isFav);
        setHomeSuggestions((prev) =>
          prev.map((s) => s.song_id === songId ? { ...s, isFavorite: isFav } : s),
        );
        toast.success(isFav ? 'Đã thêm vào yêu thích' : 'Đã xóa khỏi yêu thích');
      } catch {
        setSongPagesLoaded((prev) => {
          const next = { ...prev };
          for (const key of Object.keys(next)) {
            const n = Number(key);
            next[n] = next[n].map((s) =>
              s.song_id === songId ? { ...s, isFavorite: !s.isFavorite } : s,
            );
          }
          return next;
        });
        setHomeSuggestions((prev) =>
          prev.map((s) => s.song_id === songId ? { ...s, isFavorite: !s.isFavorite } : s),
        );
        toast.error('Không thể cập nhật yêu thích');
      }
    },
    [user?.id, upsertFavoriteOnAllPages],
  );

  const scrollPrev = useCallback(() => emblaApi?.scrollPrev(), [emblaApi]);
  const scrollNext = useCallback(() => emblaApi?.scrollNext(), [emblaApi]);

  // ── Render ─────────────────────────────────────────────────────────────────

  if (loading)
    return (
      <div className="min-h-screen bg-black text-white flex items-center justify-center">
        Đang tải...
      </div>
    );

  return (
    <div className="min-h-screen bg-black text-white pb-36">
      <div className="max-w-screen-2xl mx-auto p-6">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between sm:gap-6 mb-2">
          <h1 className="text-xl sm:text-2xl font-bold text-white shrink-0">
            Chào {user?.name || 'Thanh Hiền'}
          </h1>
          <div className="relative w-full sm:w-auto sm:min-w-[200px] sm:max-w-md sm:flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 w-4 h-4 pointer-events-none" />
            <input
              type="search"
              value={searchQuery}
              placeholder="Tìm theo tên bài, ca sĩ..."
              autoComplete="off"
              className="w-full pl-9 pr-3 py-2 text-sm bg-zinc-900 rounded-lg border border-white/10 outline-none focus:border-purple-500"
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
        </div>

        <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-base font-semibold text-white">Danh sách nhạc</h2>
          <div className="flex items-center gap-3">
            <span className="text-xs text-gray-500 whitespace-nowrap" aria-live="polite">
              Trang {swiperIndex + 1}/{totalSongPages}
            </span>
            <div className="flex gap-1">
              <button
                type="button"
                onClick={scrollPrev}
                disabled={swiperIndex <= 0}
                aria-label="Trang trước"
                className="p-1.5 rounded-md bg-zinc-800 border border-white/10 text-white disabled:opacity-30 disabled:cursor-not-allowed hover:bg-zinc-700"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <button
                type="button"
                onClick={scrollNext}
                disabled={swiperIndex >= totalSongPages - 1}
                aria-label="Trang sau"
                className="p-1.5 rounded-md bg-zinc-800 border border-white/10 text-white disabled:opacity-30 disabled:cursor-not-allowed hover:bg-zinc-700"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
        <p className="text-[11px] text-gray-500 mb-3">
          Vuốt ngang hoặc mũi tên — mỗi trang {PAGE_SIZE} bài.
        </p>

        <div className="overflow-hidden mb-14 cursor-grab active:cursor-grabbing" ref={emblaRef}>
          <div className="flex">
            {Array.from({ length: totalSongPages }, (_, idx) => {
              const pageNum = idx + 1;
              const pageData = songPagesLoaded[pageNum];
              const inFlight = !!pagesInFlight[pageNum];

              return (
                <div key={pageNum} className="min-w-0 shrink-0 grow-0 basis-full pl-1 pr-1">
                  {pageData == null ? (
                    <div className="py-24 text-center text-gray-500 text-sm border border-white/5 rounded-2xl border-dashed">
                      {inFlight ? 'Đang tải trang…' : 'Vuốt tới đây để tải bài'}
                    </div>
                  ) : pageData.length === 0 ? (
                    <div className="py-24 text-center text-gray-400">Không có bài hát phù hợp</div>
                  ) : (
                    <div className="grid grid-cols-4 gap-1 sm:gap-1.5">
                      {pageData.map((song) => (
                        <SongCard
                          key={song.song_id}
                          song={song}
                          compact
                          contextSongs={pageData}
                          isFavorite={song.isFavorite}
                          onToggleFavorite={() => handleToggleFavorite(Number(song.song_id))}
                          onAddToPlaylist={(e) => openPlaylistModal(e, song)}
                        />
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        <section aria-labelledby="home-suggestions-heading" className="mt-6">
          <div className="flex items-center gap-3 mb-6">
            <Sparkles className="text-amber-400 w-7 h-7 shrink-0" />
            <div>
              <h2 id="home-suggestions-heading" className="text-xl font-bold text-white">
                Gợi ý cho bạn
              </h2>
              <p className="text-sm text-gray-500 mt-0.5">
                Theo hashtag trong bài đã thích, ca sĩ trùng thư viện, và điểm kết hợp (lượt nghe + tim). Chưa có
                trong yêu thích. Tối đa 8 bài.
              </p>
            </div>
          </div>

          {homeSuggestions.length === 0 ? (
            <p className="text-gray-500 text-sm">
              Chưa có gợi ý. Thử thích thêm vài bài có hashtag/ca sĩ.
            </p>
          ) : (
            <div className="grid grid-cols-4 gap-1 sm:gap-1.5">
              {homeSuggestions.map((song) => (
                <SongCard
                  key={song.song_id}
                  song={song}
                  compact
                  contextSongs={homeSuggestions}
                  isFavorite={song.isFavorite}
                  onToggleFavorite={() => handleToggleFavorite(Number(song.song_id))}
                  onAddToPlaylist={(e) => openPlaylistModal(e, song)}
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
