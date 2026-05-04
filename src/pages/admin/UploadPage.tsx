import { useState, useEffect, useRef, useCallback } from 'react';
import {
  Upload, Music, Trash2, X, Check, Loader2, Plus, ChevronDown, Pencil,
} from 'lucide-react';
import { toast } from '../../lib/toast';

const API = 'http://localhost:5000/api/upload';

interface Artist {
  artist_id: number;
  artist_name: string;
}

interface SongRow {
  song_id: number;
  title: string;
  artist: string;
  file_url: string | null;
  lyrics?: string | null;
  status: string;
  play_count: number;
  like_count: number;
}

// ── Multi-select artists ───────────────────────────────────────────────────────

function ArtistSelect({
  artists,
  selected,
  onChange,
}: {
  artists: Artist[];
  selected: number[];
  onChange: (ids: number[]) => void;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const toggle = (id: number) => {
    onChange(selected.includes(id) ? selected.filter((x) => x !== id) : [...selected, id]);
  };

  const label = selected.length === 0
    ? 'Chọn ca sĩ...'
    : artists.filter((a) => selected.includes(a.artist_id)).map((a) => a.artist_name).join(', ');

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="w-full flex items-center justify-between px-4 py-2.5 bg-zinc-800 border border-white/10 rounded-lg text-sm text-left hover:border-purple-500 transition-colors"
      >
        <span className={`truncate ${selected.length === 0 ? 'text-gray-500' : 'text-white'}`}>{label}</span>
        <ChevronDown size={16} className={`shrink-0 ml-2 transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>

      {open && (
        <div className="absolute z-20 mt-1 w-full bg-zinc-800 border border-white/10 rounded-lg shadow-xl max-h-52 overflow-y-auto">
          {artists.length === 0 ? (
            <p className="p-3 text-sm text-gray-500">Không có ca sĩ nào</p>
          ) : (
            artists.map((a) => {
              const checked = selected.includes(a.artist_id);
              return (
                <button
                  key={a.artist_id}
                  type="button"
                  onClick={() => toggle(a.artist_id)}
                  className="w-full flex items-center gap-3 px-4 py-2.5 hover:bg-zinc-700 transition-colors text-sm"
                >
                  <div className={`w-4 h-4 rounded border flex items-center justify-center shrink-0 ${checked ? 'bg-purple-600 border-purple-600' : 'border-white/30'}`}>
                    {checked && <Check size={10} />}
                  </div>
                  {a.artist_name}
                </button>
              );
            })
          )}
        </div>
      )}
    </div>
  );
}

// ── Upload Page ────────────────────────────────────────────────────────────────

export default function UploadPage() {
  const [artists, setArtists] = useState<Artist[]>([]);
  const [songs, setSongs] = useState<SongRow[]>([]);
  const [loadingSongs, setLoadingSongs] = useState(true);

  // Modal state — dùng chung cho thêm (editingSong=null) và sửa (editingSong=SongRow)
  const [showModal, setShowModal] = useState(false);
  const [editingSong, setEditingSong] = useState<SongRow | null>(null);
  const [editTitle, setEditTitle] = useState('');
  const [editLyrics, setEditLyrics] = useState('');
  const [editArtistIds, setEditArtistIds] = useState<number[]>([]);
  const [editFile, setEditFile] = useState<File | null>(null);
  const [dragging, setDragging] = useState(false);
  const [saving, setSaving] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // ── Fetch ────────────────────────────────────────────────────────────────────

  const fetchSongs = useCallback(async () => {
    try {
      setLoadingSongs(true);
      const res = await fetch(`${API}/songs`);
      const data = await res.json();
      setSongs(Array.isArray(data) ? data : []);
    } catch {
      toast.error('Không thể tải danh sách bài hát');
    } finally {
      setLoadingSongs(false);
    }
  }, []);

  useEffect(() => {
    fetch(`${API}/artists`)
      .then((r) => r.json())
      .then((data) => setArtists(Array.isArray(data) ? data : []))
      .catch(() => {});
    fetchSongs();
  }, [fetchSongs]);

  // ── Modal helpers ─────────────────────────────────────────────────────────────

  const openAdd = () => {
    setEditingSong(null);
    setEditTitle('');
    setEditLyrics('');
    setEditArtistIds([]);
    setEditFile(null);
    setShowModal(true);
  };

  const openEdit = async (song: SongRow) => {
    setEditTitle(song.title);
    setEditLyrics(song.lyrics ?? '');
    setEditArtistIds([]);
    setEditFile(null);
    setEditingSong(song);
    setShowModal(true);
    try {
      const res = await fetch(`${API}/songs/${song.song_id}`);
      const data = await res.json();
      setEditArtistIds(data.artistIds ?? []);
    } catch {
      toast.error('Không thể tải thông tin bài hát');
    }
  };

  const closeModal = () => {
    setShowModal(false);
    setEditingSong(null);
  };

  // ── Save (thêm hoặc sửa) ──────────────────────────────────────────────────────

  const handleSave = async () => {
    if (!editTitle.trim()) { toast.error('Chưa nhập tiêu đề'); return; }
    if (!editingSong && !editFile) { toast.error('Chưa chọn file audio'); return; }

    const formData = new FormData();
    formData.append('title', editTitle.trim());
    if (editLyrics.trim()) formData.append('lyrics', editLyrics.trim());
    editArtistIds.forEach((id) => formData.append('artistIds', String(id)));
    if (editFile) formData.append('audio', editFile);

    setSaving(true);
    try {
      const url = editingSong ? `${API}/songs/${editingSong.song_id}` : `${API}/songs`;
      const method = editingSong ? 'PUT' : 'POST';
      const res = await fetch(url, { method, body: formData });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.message || 'Thất bại');
      }
      toast.success(editingSong ? 'Đã cập nhật bài hát!' : 'Upload thành công!');
      closeModal();
      await fetchSongs();
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Thất bại');
    } finally {
      setSaving(false);
    }
  };

  // ── Delete ────────────────────────────────────────────────────────────────────

  const handleDelete = async (id: number, title: string) => {
    if (!window.confirm(`Xóa bài "${title}"?`)) return;
    try {
      const res = await fetch(`${API}/songs/${id}`, { method: 'DELETE' });
      if (!res.ok) throw new Error();
      toast.success('Đã xóa bài hát');
      setSongs((prev) => prev.filter((s) => s.song_id !== id));
    } catch {
      toast.error('Không thể xóa bài hát');
    }
  };

  // ── Render ────────────────────────────────────────────────────────────────────

  const isAdding = showModal && !editingSong;

  return (
    <div className="min-h-screen bg-black text-white">
      <div className="max-w-screen-xl mx-auto p-6">

        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold">Quản lý bài hát</h1>
            <p className="text-gray-400 mt-1 text-sm">Upload và quản lý toàn bộ bài hát trong hệ thống</p>
          </div>
          <button
            onClick={openAdd}
            className="flex items-center gap-2 px-5 py-2.5 bg-purple-600 hover:bg-purple-700 rounded-xl font-semibold transition-colors text-sm"
          >
            <Plus size={18} /> Thêm bài hát
          </button>
        </div>

        {/* Song list */}
        {loadingSongs ? (
          <div className="flex items-center justify-center py-32 text-gray-500">
            <Loader2 className="animate-spin mr-2" size={20} /> Đang tải...
          </div>
        ) : songs.length === 0 ? (
          <div className="flex flex-col items-center gap-4 py-32 text-gray-600">
            <Music size={48} />
            <p>Chưa có bài hát nào</p>
            <button onClick={openAdd} className="text-sm text-purple-400 hover:text-purple-300 underline">
              Thêm bài hát đầu tiên
            </button>
          </div>
        ) : (
          <div className="space-y-2">
            {songs.map((song) => (
              <div
                key={song.song_id}
                className="flex items-center gap-4 p-4 bg-zinc-900 hover:bg-zinc-800 rounded-xl transition-colors"
              >
                {/* File status */}
                <div className={`shrink-0 w-8 h-8 rounded-lg flex items-center justify-center ${
                  song.file_url ? 'bg-green-500/10 text-green-400' : 'bg-zinc-700 text-gray-600'
                }`}>
                  <Music size={15} />
                </div>

                {/* Info */}
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-sm truncate">{song.title}</p>
                  <p className="text-xs text-gray-400 truncate">{song.artist}</p>
                  <div className="flex gap-3 mt-1 text-xs text-gray-600">
                    <span>▶ {song.play_count ?? 0}</span>
                    <span>♥ {song.like_count ?? 0}</span>
                    <span className={`capitalize ${song.status === 'active' ? 'text-green-500' : 'text-yellow-500'}`}>
                      {song.status}
                    </span>
                  </div>
                </div>

                {/* Actions */}
                <div className="flex gap-1 shrink-0">
                  <button
                    onClick={() => openEdit(song)}
                    className="p-2 text-gray-500 hover:text-purple-400 hover:bg-purple-500/10 rounded-lg transition-colors"
                  >
                    <Pencil size={16} />
                  </button>
                  <button
                    onClick={() => handleDelete(song.song_id, song.title)}
                    className="p-2 text-gray-500 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-colors"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ── Modal (thêm + sửa) ── */}
      {showModal && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-zinc-900 border border-white/10 rounded-2xl w-full max-w-lg shadow-2xl max-h-[90vh] overflow-y-auto">
            <div className="p-6 space-y-5">

              {/* Header */}
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-bold">
                  {isAdding ? 'Thêm bài hát mới' : `Sửa: ${editingSong?.title}`}
                </h3>
                <button onClick={closeModal} className="text-gray-500 hover:text-white transition-colors">
                  <X size={20} />
                </button>
              </div>

              {/* File audio */}
              {isAdding ? (
                // Thêm mới: bắt buộc chọn file, hỗ trợ kéo thả
                <div>
                  <label className="block text-xs text-gray-400 mb-1.5">File audio *</label>
                  <div
                    onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
                    onDragLeave={() => setDragging(false)}
                    onDrop={(e) => {
                      e.preventDefault(); setDragging(false);
                      const file = e.dataTransfer.files[0];
                      if (file) setEditFile(file);
                    }}
                    onClick={() => fileInputRef.current?.click()}
                    className={`border-2 border-dashed rounded-xl p-6 text-center cursor-pointer transition-colors ${
                      dragging ? 'border-purple-500 bg-purple-500/10' : 'border-white/15 hover:border-purple-500/60'
                    } ${editFile ? 'bg-green-500/5 border-green-500/40' : ''}`}
                  >
                    <input ref={fileInputRef} type="file" accept=".mp3,.wav,.flac,.m4a,.ogg" className="hidden"
                      onChange={(e) => setEditFile(e.target.files?.[0] ?? null)} />
                    {editFile ? (
                      <div className="space-y-1">
                        <Music className="w-8 h-8 mx-auto text-green-400" />
                        <p className="text-sm text-green-300 truncate font-medium">{editFile.name}</p>
                        <p className="text-xs text-gray-500">{(editFile.size / 1024 / 1024).toFixed(1)} MB</p>
                        <button type="button" onClick={(e) => { e.stopPropagation(); setEditFile(null); }}
                          className="text-xs text-red-400 hover:text-red-300 flex items-center gap-1 mx-auto">
                          <X size={11} /> Xóa file
                        </button>
                      </div>
                    ) : (
                      <div className="space-y-1">
                        <Upload className="w-8 h-8 mx-auto text-gray-500" />
                        <p className="text-sm text-gray-400">Kéo thả hoặc click để chọn</p>
                        <p className="text-xs text-gray-600">MP3 · WAV · FLAC · M4A · OGG — tối đa 50MB</p>
                      </div>
                    )}
                  </div>
                </div>
              ) : (
                // Sửa: hiện file cũ + tùy chọn thay thế
                <div className="space-y-2">
                  <label className="block text-xs text-gray-400">File audio hiện tại</label>
                  <div className="flex items-center gap-3 p-3 bg-zinc-800 rounded-lg">
                    <Music size={14} className="text-gray-500 shrink-0" />
                    <span className="text-xs text-gray-400 truncate flex-1">
                      {editingSong?.file_url
                        ? decodeURIComponent(editingSong.file_url.split('/').pop() ?? '')
                        : 'Chưa có file'}
                    </span>
                    {editingSong?.file_url && (
                      <audio controls src={editingSong.file_url} className="h-7 w-28 shrink-0"
                        style={{ accentColor: '#a855f7' }} />
                    )}
                  </div>

                  <input ref={fileInputRef} type="file" accept=".mp3,.wav,.flac,.m4a,.ogg" className="hidden"
                    onChange={(e) => setEditFile(e.target.files?.[0] ?? null)} />
                  <button type="button" onClick={() => fileInputRef.current?.click()}
                    className={`w-full flex items-center gap-3 px-4 py-2.5 border border-dashed rounded-lg text-sm transition-colors ${
                      editFile
                        ? 'border-green-500/50 text-green-400'
                        : 'border-white/15 text-gray-500 hover:border-purple-500/50 hover:text-gray-300'
                    }`}>
                    <Upload size={14} />
                    {editFile ? (
                      <span className="truncate flex-1 text-left">
                        {editFile.name} ({(editFile.size / 1024 / 1024).toFixed(1)} MB)
                      </span>
                    ) : (
                      <span>Chọn file mới để thay thế (tùy chọn)</span>
                    )}
                    {editFile && (
                      <X size={14} className="shrink-0 hover:text-red-400"
                        onClick={(e) => { e.stopPropagation(); setEditFile(null); }} />
                    )}
                  </button>
                </div>
              )}

              {/* Title */}
              <div>
                <label className="block text-xs text-gray-400 mb-1.5">Tiêu đề *</label>
                <input type="text" value={editTitle} onChange={(e) => setEditTitle(e.target.value)}
                  placeholder="Tên bài hát..."
                  className="w-full px-4 py-2.5 bg-zinc-800 border border-white/10 rounded-lg text-sm outline-none focus:border-purple-500 transition-colors" />
              </div>

              {/* Artists */}
              <div>
                <label className="block text-xs text-gray-400 mb-1.5">Ca sĩ</label>
                <ArtistSelect artists={artists} selected={editArtistIds} onChange={setEditArtistIds} />
              </div>

              {/* Lyrics */}
              <div>
                <label className="block text-xs text-gray-400 mb-1.5">Lời bài hát</label>
                <textarea value={editLyrics} onChange={(e) => setEditLyrics(e.target.value)}
                  placeholder="Nhập lời bài hát..."
                  rows={5}
                  className="w-full px-4 py-2.5 bg-zinc-800 border border-white/10 rounded-lg text-sm outline-none focus:border-purple-500 transition-colors resize-none" />
              </div>

              {/* Actions */}
              <div className="flex gap-3 pt-1">
                <button onClick={closeModal}
                  className="flex-1 py-2.5 rounded-xl border border-white/10 text-gray-400 hover:text-white hover:border-white/30 transition-colors text-sm">
                  Hủy
                </button>
                <button onClick={handleSave} disabled={saving}
                  className="flex-1 flex items-center justify-center gap-2 py-2.5 bg-purple-600 hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed rounded-xl text-sm font-semibold transition-colors">
                  {saving
                    ? <><Loader2 size={15} className="animate-spin" /> Đang lưu...</>
                    : isAdding
                      ? <><Plus size={15} /> Upload</>
                      : <><Check size={15} /> Lưu</>}
                </button>
              </div>

            </div>
          </div>
        </div>
      )}
    </div>
  );
}
