import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, Music, Trash2, Edit2, Loader2, Play, Sparkles, ListPlus, Heart } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { usePlayback } from '../../context/PlaybackContext';
import musicService from '../../services/musicService';
import { toast } from '../../lib/toast';
import { toPlaybackSong, AddToPlaylistModal } from '../../components/MusicPlayer';
import SongCard, { type SongCardSong } from '../../components/SongCard';
import { usePlaylist } from '../../context/PlaylistContext';

const FALLBACK_COVER = 'https://images.unsplash.com/photo-1493225255756-d9584f8606e9?w=300';
const API_BASE = 'http://localhost:5000/api/music';

export default function ListenerPlaylists() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { playIndexed, toggleLike, likedSongs } = usePlayback();
  const { playlists: ctxPlaylists, fetchPlaylists } = usePlaylist();

  // Local editable copy of playlists (CRUD operations)
  const [playlists, setPlaylists] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  console.log('playlists: ', playlists);
  const [isCreating, setIsCreating] = useState(false);
  const [newPlaylistName, setNewPlaylistName] = useState('');
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editName, setEditName] = useState('');

  // Recommendations
  const [suggestions, setSuggestions] = useState<any[]>([]);
  const [loadingSug, setLoadingSug] = useState(false);
  const [modalSong, setModalSong] = useState<any | null>(null);

  // Load playlists
  useEffect(() => {
    if (!user?.id) return;
    setLoading(true);
    musicService.getPlaylists(user.id)
      .then((data: any[]) => setPlaylists(data))
      .catch(() => toast.error('Không thể tải danh sách playlist'))
      .finally(() => setLoading(false));
  }, [user?.id]);

  // Load recommendations
  useEffect(() => {
    if (!user?.id) return;
    setLoadingSug(true);
    musicService.getHomeSuggestions(user.id)
      .then((data: any[]) => setSuggestions(Array.isArray(data) ? data.slice(0, 12) : []))
      .catch(() => {})
      .finally(() => setLoadingSug(false));
  }, [user?.id]);

  // ── CRUD ────────────────────────────────────────────────────────────────────

  const handleCreatePlaylist = async () => {
    if (!newPlaylistName.trim()) return;
    try {
      const res = await musicService.createPlaylist({
        name: newPlaylistName.trim(),
        userId: user?.id,
        coverUrl: 'https://images.unsplash.com/photo-1514525253161-7a46d19cd819?w=400',
      });
      const created = { ...res, songs: [] };
      setPlaylists((p) => [...p, created]);
      fetchPlaylists();
      setNewPlaylistName('');
      setIsCreating(false);
      toast.success('Đã tạo playlist');
    } catch {
      toast.error('Không thể tạo playlist');
    }
  };

  const handleDeletePlaylist = async (id: number) => {
    if (!window.confirm('Xóa playlist này?')) return;
    try {
      await musicService.deletePlaylist(id);
      setPlaylists((p) => p.filter((x) => x.id !== id));
      fetchPlaylists();
      toast.success('Đã xóa playlist');
    } catch {
      toast.error('Không thể xóa playlist');
    }
  };

  const handleEditPlaylist = async (id: number) => {
    if (!editName.trim()) return;
    try {
      await musicService.updatePlaylist(id, { name: editName.trim() });
      setPlaylists((p) => p.map((x) => x.id === id ? { ...x, name: editName.trim() } : x));
      fetchPlaylists();
      setEditingId(null);
      toast.success('Đã đổi tên playlist');
    } catch {
      toast.error('Không thể đổi tên playlist');
    }
  };

  // Quick-play a playlist from the grid card
  const handleQuickPlay = async (e: React.MouseEvent, playlist: any) => {
    e.stopPropagation();
    try {
      const songs = await musicService.getPlaylistSongs(playlist.id);
      if (!songs.length) { toast.info('Playlist chưa có bài hát'); return; }
      playIndexed(songs.map(toPlaybackSong), 0);
    } catch {
      toast.error('Không thể phát playlist');
    }
  };

  // ── Loading ─────────────────────────────────────────────────────────────────

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center text-white">
        <Loader2 className="w-10 h-10 animate-spin text-purple-500 mr-3" />
        <p className="text-xl font-medium">Đang tải giai điệu của Hiền...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-purple-900 to-black text-white pb-28">
      <div className="max-w-4xl mx-auto px-8 py-6">

        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-4xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-white to-purple-400">
              Playlist Của Tôi
            </h1>
            <p className="text-gray-400 mt-2">Nơi lưu giữ những bản nhạc Hiền yêu thích</p>
          </div>
          <button
            onClick={() => setIsCreating(true)}
            className="flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-purple-600 to-blue-600 rounded-xl hover:scale-105 transition-all shadow-lg font-semibold"
          >
            <Plus className="w-5 h-5" />
            Tạo Mới
          </button>
        </div>

        {/* Create form */}
        {isCreating && (
          <div className="mb-8 p-6 bg-white/10 rounded-2xl border border-white/20 backdrop-blur-xl">
            <h3 className="text-xl font-semibold mb-4 text-purple-300">Đặt tên cho playlist</h3>
            <div className="flex gap-3">
              <input
                type="text"
                value={newPlaylistName}
                onChange={(e) => setNewPlaylistName(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleCreatePlaylist()}
                placeholder="Ví dụ: Nhạc học tập trung..."
                className="flex-1 px-4 py-3 bg-black/40 border border-white/10 rounded-xl focus:ring-2 focus:ring-purple-500 text-white placeholder:text-gray-500"
                autoFocus
              />
              <button onClick={handleCreatePlaylist} className="px-6 py-2 bg-purple-600 rounded-xl hover:bg-purple-700 transition-colors font-medium">
                Xác nhận
              </button>
              <button onClick={() => { setIsCreating(false); setNewPlaylistName(''); }} className="px-6 py-2 bg-gray-700 rounded-xl hover:bg-gray-600 transition-colors">
                Hủy
              </button>
            </div>
          </div>
        )}

        {/* Playlist grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {playlists.length === 0 ? (
            <div className="col-span-full text-center py-32 bg-white/5 rounded-3xl border-2 border-dashed border-white/10">
              <Music className="w-20 h-20 mx-auto mb-4 text-gray-600" />
              <p className="text-xl text-gray-400">Danh sách trống. Bắt đầu tạo playlist ngay thôi Hiền!</p>
            </div>
          ) : (
            playlists.map((playlist) => (
              <div
                key={playlist.id}
                onClick={() => navigate(`/playlists/${playlist.id}`)}
                className="group bg-white/5 rounded-2xl p-4 hover:bg-white/10 transition-all border border-white/5 hover:border-purple-500/50 relative overflow-hidden cursor-pointer"
              >
                <div className="relative aspect-square mb-4 overflow-hidden rounded-xl">
                  <img
                    src={playlist.coverUrl || FALLBACK_COVER}
                    alt={playlist.name}
                    onError={(e) => { (e.target as HTMLImageElement).src = FALLBACK_COVER; }}
                    className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
                  />
                  <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                    <button
                      onClick={(e) => handleQuickPlay(e, playlist)}
                      className="p-4 bg-purple-600 rounded-full shadow-xl hover:scale-110 transition-transform"
                    >
                      <Play className="w-6 h-6 fill-white text-white" />
                    </button>
                  </div>
                </div>

                {editingId === playlist.id ? (
                  <div className="space-y-2" onClick={(e) => e.stopPropagation()}>
                    <input
                      type="text"
                      value={editName}
                      onChange={(e) => setEditName(e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && handleEditPlaylist(playlist.id)}
                      className="w-full px-3 py-2 bg-black/60 border border-purple-500 rounded-lg text-sm"
                      autoFocus
                    />
                    <div className="flex gap-2">
                      <button onClick={() => handleEditPlaylist(playlist.id)} className="flex-1 py-1.5 bg-purple-600 rounded text-xs">Lưu</button>
                      <button onClick={() => setEditingId(null)} className="flex-1 py-1.5 bg-gray-700 rounded text-xs">Hủy</button>
                    </div>
                  </div>
                ) : (
                  <div className="flex items-start justify-between">
                    <div className="flex-1 min-w-0">
                      <h3 className="text-lg font-bold truncate group-hover:text-purple-400 transition-colors">{playlist.name}</h3>
                      <p className="text-xs text-gray-400 mt-1 flex items-center gap-1.5">
                        <Music className="w-3 h-3" />
                        {(
                          playlist.songCount ??
                          playlist.song_count ??
                          playlist.totalSongs ??
                          playlist.total_songs ??
                          playlist.tracksCount ??
                          playlist.tracks_count ??
                          (Array.isArray(playlist.songs) ? playlist.songs.length : undefined) ??
                          0
                        )} bài hát
                      </p>
                    </div>
                    <div className="flex gap-1 ml-2" onClick={(e) => e.stopPropagation()}>
                      <button onClick={() => { setEditingId(playlist.id); setEditName(playlist.name); }} className="p-2 hover:bg-white/10 rounded-full text-gray-400 hover:text-purple-300 transition-colors">
                        <Edit2 className="w-4 h-4" />
                      </button>
                      <button onClick={() => handleDeletePlaylist(playlist.id)} className="p-2 hover:bg-red-500/10 rounded-full text-gray-400 hover:text-red-400 transition-colors">
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                )}
              </div>
            ))
          )}
        </div>

        {/* ── Recommendations ──────────────────────────────────────────────── */}
        <div className="mt-14">
          <div className="flex items-center gap-3 mb-6">
            <Sparkles className="w-5 h-5 text-purple-400" />
            <h2 className="text-2xl font-bold">Gợi ý cho Hiền</h2>
            <span className="text-sm text-gray-400">Những bài phù hợp để thêm vào playlist</span>
          </div>

          {loadingSug ? (
            <div className="flex gap-3 py-6">
              {[...Array(6)].map((_, i) => (
                <div key={i} className="w-40 h-56 bg-white/5 rounded-2xl animate-pulse shrink-0" />
              ))}
            </div>
          ) : suggestions.length === 0 ? (
            <p className="text-gray-500 italic">Hãy thêm yêu thích để nhận gợi ý!</p>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {suggestions.map((song) => (
                <SongCard
                  key={song.song_id}
                  song={song as SongCardSong}
                  contextSongs={suggestions as SongCardSong[]}
                  isFavorite={likedSongs.has(Number(song.song_id))}
                  onToggleFavorite={() => { user && toggleLike(Number(song.song_id), user.id); }}
                  onAddToPlaylist={(e) => { e.stopPropagation(); setModalSong(song); }}
                  showPlayCount
                />
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Add to playlist modal */}
      {modalSong && (
        <AddToPlaylistModal
          song={{ song_id: modalSong.song_id, title: modalSong.title, artist: modalSong.artist }}
          playlists={playlists.map((p) => ({ id: p.id, name: p.name }))}
          apiBase={API_BASE}
          onClose={() => setModalSong(null)}
        />
      )}
    </div>
  );
}
