import { useEffect, useState, useCallback, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { DndProvider, useDrag, useDrop } from 'react-dnd';
import { HTML5Backend } from 'react-dnd-html5-backend';
import {
  ChevronLeft, Play, Repeat, Repeat1, Loader2,
  Music, GripVertical, Volume2, Trash2, ListMusic,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { usePlayback } from '../../context/PlaybackContext';
import musicService from '../../services/musicService';
import { toast } from '../../lib/toast';
import { toPlaybackSong } from '../../components/MusicPlayer';
import { getSongItemImageSrc } from '../../lib/songCover';

const DRAG_TYPE = 'PD_SONG';
const FALLBACK_COVER = 'https://images.unsplash.com/photo-1493225255756-d9584f8606e9?w=300';

// ── Draggable row ─────────────────────────────────────────────────────────────

interface RowProps {
  song: any;
  idx: number;
  isCurrent: boolean;
  onPlay: () => void;
  onRemove: () => void;
  onMove: (from: number, to: number) => void;
}

function SongRow({ song, idx, isCurrent, onPlay, onRemove, onMove }: RowProps) {
  const rowRef = useRef<HTMLDivElement>(null);
  const gripRef = useRef<HTMLDivElement>(null);

  const [{ isDragging }, drag, preview] = useDrag({
    type: DRAG_TYPE,
    item: { idx },
    collect: (m) => ({ isDragging: m.isDragging() }),
  });
  const [{ isOver }, drop] = useDrop({
    accept: DRAG_TYPE,
    collect: (m) => ({ isOver: m.isOver() }),
    hover(item: { idx: number }) {
      if (item.idx === idx) return;
      onMove(item.idx, idx);
      item.idx = idx;
    },
  });

  drag(gripRef);
  preview(drop(rowRef));

  const cover = getSongItemImageSrc(song, FALLBACK_COVER);

  return (
    <div
      ref={rowRef}
      className={[
        'flex items-center gap-3 p-3 rounded-xl group transition-all select-none',
        isDragging ? 'opacity-40' : '',
        isOver ? 'bg-purple-500/10' : '',
        isCurrent
          ? 'bg-purple-500/20 border border-purple-500/40'
          : 'hover:bg-white/5 border border-transparent',
      ].join(' ')}
    >
      <div ref={gripRef} className="shrink-0 cursor-grab active:cursor-grabbing text-gray-600 hover:text-gray-400 touch-none">
        <GripVertical className="w-4 h-4" />
      </div>

      <div className="w-6 shrink-0 flex items-center justify-center">
        {isCurrent ? (
          <Volume2 className="w-4 h-4 text-purple-400 animate-pulse" />
        ) : (
          <>
            <span className="text-xs text-gray-500 group-hover:hidden">{idx + 1}</span>
            <button
              onClick={(e) => { e.stopPropagation(); onPlay(); }}
              className="hidden group-hover:flex"
            >
              <Play className="w-3.5 h-3.5 fill-white text-white" />
            </button>
          </>
        )}
      </div>

      <img
        src={cover}
        alt={song.title}
        onError={(e) => { (e.target as HTMLImageElement).src = FALLBACK_COVER; }}
        className="w-10 h-10 rounded-lg object-cover shrink-0"
      />

      <div className="flex-1 min-w-0">
        <p className={`text-sm font-medium truncate ${isCurrent ? 'text-purple-300' : 'text-white'}`}>
          {song.title}
        </p>
        <p className="text-xs text-gray-400 truncate">{song.artist || 'Chưa xác định'}</p>
      </div>

      <button
        onClick={() => onRemove()}
        className="shrink-0 opacity-0 group-hover:opacity-100 p-2 rounded-full text-gray-500 hover:text-red-400 hover:bg-red-500/10 transition-all"
      >
        <Trash2 className="w-3.5 h-3.5" />
      </button>
    </div>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default function PlaylistDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { currentSong, loopMode, cycleLoop, playIndexed } = usePlayback();

  const [playlist, setPlaylist] = useState<any | null>(null);
  const [songs, setSongs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Load playlist info + songs
  useEffect(() => {
    if (!id || !user?.id) return;
    const playlistId = Number(id);
    setLoading(true);
    Promise.all([
      musicService.getPlaylists(user.id),
      musicService.getPlaylistSongs(playlistId),
    ])
      .then(([playlists, songData]) => {
        const found = playlists.find((p: any) => p.id === playlistId);
        setPlaylist(found ?? { id: playlistId, name: 'Playlist', coverUrl: null });
        setSongs(songData);
      })
      .catch(() => toast.error('Không thể tải playlist'))
      .finally(() => setLoading(false));
  }, [id, user?.id]);

  const handlePlayAll = () => {
    if (songs.length === 0) return;
    playIndexed(songs.map(toPlaybackSong), 0);
  };

  const handlePlaySong = (idx: number) => {
    playIndexed(songs.map(toPlaybackSong), idx);
  };

  const handleRemoveSong = async (songId: number) => {
    if (!id) return;
    try {
      await musicService.removeSongFromPlaylist(Number(id), songId);
      setSongs((prev) => prev.filter((s) => s.song_id !== songId));
      toast.success('Đã xóa khỏi playlist');
    } catch {
      toast.error('Không thể xóa bài hát');
    }
  };

  const handleMoveSong = useCallback((from: number, to: number) => {
    setSongs((prev) => {
      const next = [...prev];
      const [moved] = next.splice(from, 1);
      next.splice(to, 0, moved);
      return next;
    });
  }, []);

  const loopTitle =
    loopMode === 'none' ? 'Không lặp' : loopMode === 'all' ? 'Lặp tất cả' : 'Lặp 1 bài';

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center text-white">
        <Loader2 className="w-8 h-8 animate-spin text-purple-500 mr-3" />
        <span className="text-lg">Đang tải...</span>
      </div>
    );
  }

  return (
    <DndProvider backend={HTML5Backend}>
      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-purple-900 to-black text-white p-6">
        <div className="max-w-3xl mx-auto">

          {/* Header */}
          <div className="flex items-center gap-4 mb-8 flex-wrap">
            <button
              onClick={() => navigate('/playlists')}
              className="p-2 hover:bg-white/10 rounded-xl transition-colors"
            >
              <ChevronLeft className="w-6 h-6" />
            </button>
            <img
              src={playlist?.coverUrl || FALLBACK_COVER}
              alt={playlist?.name}
              onError={(e) => { (e.target as HTMLImageElement).src = FALLBACK_COVER; }}
              className="w-16 h-16 rounded-xl object-cover shadow-lg shadow-purple-500/30"
            />
            <div className="flex-1 min-w-0">
              <h1 className="text-2xl font-bold truncate">{playlist?.name}</h1>
              <p className="text-sm text-gray-400 mt-0.5 flex items-center gap-1.5">
                <ListMusic className="w-3.5 h-3.5" />
                {songs.length} bài hát
              </p>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <button
                onClick={cycleLoop}
                title={loopTitle}
                className={`p-2.5 rounded-xl transition-all ${
                  loopMode !== 'none'
                    ? 'text-purple-400 bg-purple-500/20'
                    : 'text-gray-400 hover:bg-white/10'
                }`}
              >
                {loopMode === 'one'
                  ? <Repeat1 className="w-5 h-5" />
                  : <Repeat className="w-5 h-5" />}
              </button>
              <button
                onClick={handlePlayAll}
                disabled={songs.length === 0}
                className="flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-purple-600 to-blue-600 rounded-xl hover:scale-105 transition-all font-semibold disabled:opacity-40 disabled:hover:scale-100"
              >
                <Play className="w-4 h-4 fill-white" />
                Phát tất cả
              </button>
            </div>
          </div>

          {/* Loop badge */}
          {loopMode !== 'none' && (
            <div className="mb-4 flex items-center gap-2 text-xs text-purple-400 bg-purple-500/10 border border-purple-500/20 rounded-lg px-3 py-2 w-fit">
              {loopMode === 'one' ? <Repeat1 className="w-3.5 h-3.5" /> : <Repeat className="w-3.5 h-3.5" />}
              {loopTitle}
            </div>
          )}

          {/* Song list */}
          {songs.length === 0 ? (
            <div className="text-center py-24 bg-white/5 rounded-3xl border-2 border-dashed border-white/10">
              <Music className="w-16 h-16 mx-auto mb-3 text-gray-600" />
              <p className="text-gray-400">Playlist trống. Thêm bài hát từ trang nhạc!</p>
            </div>
          ) : (
            <div className="space-y-1">
              {songs.map((song, idx) => (
                <SongRow
                  key={song.song_id}
                  song={song}
                  idx={idx}
                  isCurrent={
                    currentSong != null &&
                    Number(currentSong.song_id) === Number(song.song_id)
                  }
                  onPlay={() => handlePlaySong(idx)}
                  onRemove={() => handleRemoveSong(song.song_id)}
                  onMove={handleMoveSong}
                />
              ))}
            </div>
          )}
        </div>
      </div>
    </DndProvider>
  );
}
