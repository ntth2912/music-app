import { useState, useEffect, useRef, useCallback } from 'react';
import {
  Upload, Music, Trash2, X, Check, Loader2, Plus, ChevronDown,
  Pencil, Search, ChevronLeft, ChevronRight, CheckCircle2, Clock, Ban,
} from 'lucide-react';
import { toast } from '../../lib/toast';

const API = 'http://localhost:5000/api/upload';
const PAGE_SIZE = 10;

interface Artist { artist_id: number; artist_name: string; }
interface Hashtag { hashtag_id: number; name: string; }
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

// ── Generic multi-select dropdown (artists) ───────────────────────────────────

function MultiSelect<T extends { id: number; label: string }>({
  items, selected, onChange, placeholder,
}: {
  items: T[];
  selected: number[];
  onChange: (ids: number[]) => void;
  placeholder: string;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const h = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false); };
    document.addEventListener('mousedown', h);
    return () => document.removeEventListener('mousedown', h);
  }, []);

  const toggle = (id: number) =>
    onChange(selected.includes(id) ? selected.filter((x) => x !== id) : [...selected, id]);

  const label = selected.length === 0
    ? placeholder
    : items.filter((a) => selected.includes(a.id)).map((a) => a.label).join(', ');

  return (
    <div ref={ref} className="relative">
      <button type="button" onClick={() => setOpen((v) => !v)}
        className="w-full flex items-center justify-between px-4 py-2.5 bg-zinc-800 border border-white/10 rounded-lg text-sm text-left hover:border-purple-500 transition-colors">
        <span className={`truncate ${selected.length === 0 ? 'text-gray-500' : 'text-white'}`}>{label}</span>
        <ChevronDown size={16} className={`shrink-0 ml-2 transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>
      {open && (
        <div className="absolute z-20 mt-1 w-full bg-zinc-800 border border-white/10 rounded-lg shadow-xl max-h-52 overflow-y-auto">
          {items.length === 0 ? <p className="p-3 text-sm text-gray-500">Trống</p> : items.map((a) => {
            const checked = selected.includes(a.id);
            return (
              <button key={a.id} type="button" onClick={() => toggle(a.id)}
                className="w-full flex items-center gap-3 px-4 py-2.5 hover:bg-zinc-700 transition-colors text-sm">
                <div className={`w-4 h-4 rounded border flex items-center justify-center shrink-0 ${checked ? 'bg-purple-600 border-purple-600' : 'border-white/30'}`}>
                  {checked && <Check size={10} />}
                </div>
                {a.label}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ── Hashtag select: chọn có sẵn hoặc nhập tạo mới ─────────────────────────────

function HashtagSelect({
  hashtags, selected, onChange, onCreateNew,
}: {
  hashtags: Hashtag[];
  selected: number[];
  onChange: (ids: number[]) => void;
  onCreateNew: (name: string) => Promise<Hashtag>;
}) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [creating, setCreating] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const h = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) { setOpen(false); setQuery(''); } };
    document.addEventListener('mousedown', h);
    return () => document.removeEventListener('mousedown', h);
  }, []);

  const filtered = query.trim()
    ? hashtags.filter((h) => h.name.toLowerCase().includes(query.trim().toLowerCase()))
    : hashtags;

  const exactMatch = hashtags.some((h) => h.name.toLowerCase() === query.trim().toLowerCase());
  const canCreate = query.trim().length > 0 && !exactMatch;

  const toggle = (id: number) =>
    onChange(selected.includes(id) ? selected.filter((x) => x !== id) : [...selected, id]);

  const handleCreate = async () => {
    if (!canCreate || creating) return;
    setCreating(true);
    try {
      const newTag = await onCreateNew(query.trim());
      onChange([...selected, newTag.hashtag_id]);
      setQuery('');
    } finally {
      setCreating(false);
    }
  };

  const handleOpen = () => {
    setOpen(true);
    setTimeout(() => inputRef.current?.focus(), 50);
  };

  const label = selected.length === 0
    ? 'Chọn hoặc nhập hashtag...'
    : hashtags.filter((h) => selected.includes(h.hashtag_id)).map((h) => `#${h.name}`).join(', ');

  return (
    <div ref={ref} className="relative">
      <button type="button" onClick={handleOpen}
        className="w-full flex items-center justify-between px-4 py-2.5 bg-zinc-800 border border-white/10 rounded-lg text-sm text-left hover:border-cyan-500 transition-colors">
        <span className={`truncate ${selected.length === 0 ? 'text-gray-500' : 'text-cyan-300'}`}>{label}</span>
        <ChevronDown size={16} className={`shrink-0 ml-2 transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>

      {open && (
        <div className="absolute z-20 mt-1 w-full bg-zinc-800 border border-white/10 rounded-lg shadow-xl overflow-hidden">
          {/* Search/create input */}
          <div className="p-2 border-b border-white/10">
            <div className="flex items-center gap-2 px-3 py-2 bg-zinc-700 rounded-lg">
              <Search size={13} className="text-gray-400 shrink-0" />
              <input
                ref={inputRef}
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); handleCreate(); } }}
                placeholder="Tìm hoặc nhập tên mới..."
                className="flex-1 bg-transparent text-sm outline-none text-white placeholder:text-gray-500"
              />
              {query && <button type="button" onClick={() => setQuery('')}><X size={12} className="text-gray-400 hover:text-white" /></button>}
            </div>
          </div>

          {/* List */}
          <div className="max-h-44 overflow-y-auto">
            {filtered.length === 0 && !canCreate && (
              <p className="p-3 text-sm text-gray-500">Không tìm thấy hashtag</p>
            )}
            {filtered.map((h) => {
              const checked = selected.includes(h.hashtag_id);
              return (
                <button key={h.hashtag_id} type="button" onClick={() => toggle(h.hashtag_id)}
                  className="w-full flex items-center gap-3 px-4 py-2 hover:bg-zinc-700 transition-colors text-sm">
                  <div className={`w-4 h-4 rounded border flex items-center justify-center shrink-0 ${checked ? 'bg-cyan-600 border-cyan-600' : 'border-white/30'}`}>
                    {checked && <Check size={10} />}
                  </div>
                  <span className="text-cyan-300/80">#{h.name}</span>
                </button>
              );
            })}

            {/* Create new option */}
            {canCreate && (
              <button type="button" onClick={handleCreate} disabled={creating}
                className="w-full flex items-center gap-3 px-4 py-2.5 hover:bg-cyan-900/30 transition-colors text-sm text-cyan-400 border-t border-white/10 disabled:opacity-50">
                {creating
                  ? <Loader2 size={14} className="animate-spin shrink-0" />
                  : <Plus size={14} className="shrink-0" />}
                Tạo mới <span className="font-semibold">#{query.trim()}</span>
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

// ── Status badge ──────────────────────────────────────────────────────────────

function StatusBadge({ status }: { status: string }) {
  if (status === 'active')
    return <span className="flex items-center gap-1 text-green-400 text-xs"><CheckCircle2 size={11} />Hoạt động</span>;
  if (status === 'pending')
    return <span className="flex items-center gap-1 text-yellow-400 text-xs"><Clock size={11} />Chờ duyệt</span>;
  return <span className="flex items-center gap-1 text-gray-500 text-xs"><Ban size={11} />Tắt</span>;
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default function UploadPage() {
  const [artists, setArtists] = useState<Artist[]>([]);
  const [hashtags, setHashtags] = useState<Hashtag[]>([]);
  const [songs, setSongs] = useState<SongRow[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loadingSongs, setLoadingSongs] = useState(true);
  const [search, setSearch] = useState('');
  const [searchInput, setSearchInput] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');

  // Modal
  const [showModal, setShowModal] = useState(false);
  const [editingSong, setEditingSong] = useState<SongRow | null>(null);
  const [editTitle, setEditTitle] = useState('');
  const [editLyrics, setEditLyrics] = useState('');
  const [editArtistIds, setEditArtistIds] = useState<number[]>([]);
  const [editHashtagIds, setEditHashtagIds] = useState<number[]>([]);
  const [editFile, setEditFile] = useState<File | null>(null);
  const [editStatus, setEditStatus] = useState('active');
  const [dragging, setDragging] = useState(false);
  const [saving, setSaving] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Debounce search
  useEffect(() => {
    const t = setTimeout(() => { setSearch(searchInput); setPage(1); }, 300);
    return () => clearTimeout(t);
  }, [searchInput]);

  // ── Fetch ─────────────────────────────────────────────────────────────────────

  const fetchSongs = useCallback(async (p = page) => {
    setLoadingSongs(true);
    try {
      const params = new URLSearchParams({
        page: String(p),
        limit: String(PAGE_SIZE),
        ...(search ? { q: search } : {}),
        ...(statusFilter !== 'all' ? { status: statusFilter } : {}),
      });
      const res = await fetch(`${API}/songs?${params}`);
      const data = await res.json();
      setSongs(Array.isArray(data.songs) ? data.songs : []);
      setTotal(data.total ?? 0);
    } catch {
      toast.error('Không thể tải danh sách bài hát');
    } finally {
      setLoadingSongs(false);
    }
  }, [page, search, statusFilter]);

  useEffect(() => { fetchSongs(page); }, [fetchSongs, page]);

  useEffect(() => {
    fetch(`${API}/artists`).then((r) => r.json()).then((d) => setArtists(Array.isArray(d) ? d : [])).catch(() => {});
    fetch(`${API}/hashtags`).then((r) => r.json()).then((d) => setHashtags(Array.isArray(d) ? d : [])).catch(() => {});
  }, []);

  // ── Modal helpers ─────────────────────────────────────────────────────────────

  const openAdd = () => {
    setEditingSong(null);
    setEditTitle(''); setEditLyrics(''); setEditArtistIds([]); setEditHashtagIds([]);
    setEditFile(null); setEditStatus('active');
    setShowModal(true);
  };

  const openEdit = async (song: SongRow) => {
    setEditTitle(song.title);
    setEditLyrics(song.lyrics ?? '');
    setEditArtistIds([]); setEditHashtagIds([]);
    setEditFile(null); setEditStatus(song.status);
    setEditingSong(song);
    setShowModal(true);
    try {
      const res = await fetch(`${API}/songs/${song.song_id}`);
      const data = await res.json();
      setEditArtistIds(data.artistIds ?? []);
      setEditHashtagIds(data.hashtagIds ?? []);
    } catch {
      toast.error('Không thể tải thông tin bài hát');
    }
  };

  const closeModal = () => { setShowModal(false); setEditingSong(null); };

  // ── Create hashtag ────────────────────────────────────────────────────────────

  const handleCreateHashtag = async (name: string): Promise<Hashtag> => {
    const res = await fetch(`${API}/hashtags`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name }),
    });
    if (!res.ok) throw new Error('Không thể tạo hashtag');
    const newTag: Hashtag = await res.json();
    setHashtags((prev) => {
      if (prev.some((h) => h.hashtag_id === newTag.hashtag_id)) return prev;
      return [...prev, newTag].sort((a, b) => a.name.localeCompare(b.name));
    });
    toast.success(`Đã tạo #${newTag.name}`);
    return newTag;
  };

  // ── Save ──────────────────────────────────────────────────────────────────────

  const handleSave = async () => {
    if (!editTitle.trim()) { toast.error('Chưa nhập tiêu đề'); return; }
    if (!editingSong && !editFile) { toast.error('Chưa chọn file audio'); return; }

    const formData = new FormData();
    formData.append('title', editTitle.trim());
    if (editLyrics.trim()) formData.append('lyrics', editLyrics.trim());
    formData.append('status', editStatus);
    editArtistIds.forEach((id) => formData.append('artistIds', String(id)));
    editHashtagIds.forEach((id) => formData.append('hashtagIds', String(id)));
    if (editFile) formData.append('audio', editFile);

    setSaving(true);
    try {
      const url = editingSong ? `${API}/songs/${editingSong.song_id}` : `${API}/songs`;
      const method = editingSong ? 'PUT' : 'POST';
      const res = await fetch(url, { method, body: formData });
      if (!res.ok) { const e = await res.json(); throw new Error(e.message || 'Thất bại'); }
      toast.success(editingSong ? 'Đã cập nhật!' : 'Upload thành công!');
      closeModal();
      await fetchSongs(page);
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Thất bại');
    } finally {
      setSaving(false);
    }
  };

  // ── Status actions ────────────────────────────────────────────────────────────

  const handleStatusChange = async (songId: number, newStatus: string) => {
    try {
      const res = await fetch(`${API}/songs/${songId}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus }),
      });
      if (!res.ok) throw new Error();
      setSongs((prev) => prev.map((s) => s.song_id === songId ? { ...s, status: newStatus } : s));
      const msg = newStatus === 'active' ? 'Đã duyệt' : newStatus === 'pending' ? 'Đặt chờ duyệt' : 'Đã tắt';
      toast.success(msg);
    } catch {
      toast.error('Không thể cập nhật trạng thái');
    }
  };

  // ── Delete ────────────────────────────────────────────────────────────────────

  const handleDelete = async (id: number, title: string) => {
    if (!window.confirm(`Xóa bài "${title}"?`)) return;
    try {
      const res = await fetch(`${API}/songs/${id}`, { method: 'DELETE' });
      if (!res.ok) throw new Error();
      toast.success('Đã xóa bài hát');
      await fetchSongs(page);
    } catch {
      toast.error('Không thể xóa bài hát');
    }
  };

  // ── Pagination ────────────────────────────────────────────────────────────────

  const totalPages = Math.ceil(total / PAGE_SIZE);

  const artistItems = artists.map((a) => ({ id: a.artist_id, label: a.artist_name }));
  const isAdding = showModal && !editingSong;

  const STATUS_TABS = [
    { key: 'all', label: 'Tất cả' },
    { key: 'active', label: 'Hoạt động' },
    { key: 'pending', label: 'Chờ duyệt' },
    { key: 'inactive', label: 'Đã tắt' },
  ];

  // ── Render ────────────────────────────────────────────────────────────────────

  return (
    <div className="min-h-screen bg-black text-white">
      <div className="max-w-screen-xl mx-auto p-6">

        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-3xl font-bold">Quản lý bài hát</h1>
            <p className="text-gray-400 mt-1 text-sm">{total} bài hát trong hệ thống</p>
          </div>
          <button
            onClick={openAdd}
            className="flex items-center gap-2 px-5 py-2.5 bg-purple-600 hover:bg-purple-700 rounded-xl font-semibold transition-colors text-sm"
          >
            <Plus size={18} /> Thêm bài hát
          </button>
        </div>

        {/* Search + filter */}
        <div className="flex flex-col sm:flex-row gap-3 mb-4">
          <div className="relative flex-1 max-w-sm">
            <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
            <input
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              placeholder="Tìm theo tên bài..."
              className="w-full pl-9 pr-4 py-2.5 bg-zinc-900 border border-white/10 rounded-xl text-sm outline-none focus:border-purple-500 transition-colors"
            />
            {searchInput && (
              <button onClick={() => { setSearchInput(''); setSearch(''); setPage(1); }}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-white">
                <X size={13} />
              </button>
            )}
          </div>

          {/* Status tabs */}
          <div className="flex gap-1 bg-zinc-900 border border-white/10 rounded-xl p-1">
            {STATUS_TABS.map((tab) => (
              <button key={tab.key}
                onClick={() => { setStatusFilter(tab.key); setPage(1); }}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                  statusFilter === tab.key ? 'bg-purple-600 text-white' : 'text-gray-400 hover:text-white'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        {/* Song list */}
        {loadingSongs ? (
          <div className="flex items-center justify-center py-32 text-gray-500">
            <Loader2 className="animate-spin mr-2" size={20} /> Đang tải...
          </div>
        ) : songs.length === 0 ? (
          <div className="flex flex-col items-center gap-4 py-32 text-gray-600">
            <Music size={48} />
            <p>{search ? `Không tìm thấy bài hát "${search}"` : 'Chưa có bài hát nào'}</p>
          </div>
        ) : (
          <>
            <div className="space-y-2 mb-6">
              {songs.map((song) => (
                <div key={song.song_id}
                  className="flex items-center gap-4 p-4 bg-zinc-900 hover:bg-zinc-800 rounded-xl transition-colors">

                  {/* File icon */}
                  <div className={`shrink-0 w-8 h-8 rounded-lg flex items-center justify-center ${
                    song.file_url ? 'bg-green-500/10 text-green-400' : 'bg-zinc-700 text-gray-600'
                  }`}>
                    <Music size={15} />
                  </div>

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-sm truncate">{song.title}</p>
                    <p className="text-xs text-gray-400 truncate">{song.artist}</p>
                    <div className="flex items-center gap-3 mt-1 text-xs text-gray-600">
                      <span>▶ {song.play_count ?? 0}</span>
                      <span>♥ {song.like_count ?? 0}</span>
                      <StatusBadge status={song.status} />
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-1 shrink-0">
                    {/* Approve button — only for pending */}
                    {song.status === 'pending' && (
                      <button
                        onClick={() => handleStatusChange(song.song_id, 'active')}
                        title="Duyệt bài"
                        className="flex items-center gap-1.5 px-3 py-1.5 text-xs bg-green-500/10 text-green-400 hover:bg-green-500/20 rounded-lg transition-colors font-medium"
                      >
                        <CheckCircle2 size={13} /> Duyệt
                      </button>
                    )}
                    {/* Toggle active/inactive */}
                    {song.status === 'active' && (
                      <button
                        onClick={() => handleStatusChange(song.song_id, 'inactive')}
                        title="Tắt bài"
                        className="p-2 text-gray-500 hover:text-yellow-400 hover:bg-yellow-500/10 rounded-lg transition-colors"
                      >
                        <Ban size={15} />
                      </button>
                    )}
                    {song.status === 'inactive' && (
                      <button
                        onClick={() => handleStatusChange(song.song_id, 'active')}
                        title="Bật lại"
                        className="p-2 text-gray-500 hover:text-green-400 hover:bg-green-500/10 rounded-lg transition-colors"
                      >
                        <CheckCircle2 size={15} />
                      </button>
                    )}

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

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="flex items-center justify-center gap-3">
                <button
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={page === 1}
                  className="p-2 rounded-lg border border-white/10 text-gray-400 hover:text-white hover:border-white/30 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                >
                  <ChevronLeft size={16} />
                </button>
                <span className="text-sm text-gray-400">
                  Trang <span className="text-white font-semibold">{page}</span> / {totalPages}
                  <span className="ml-2 text-gray-600">({total} bài)</span>
                </span>
                <button
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                  disabled={page === totalPages}
                  className="p-2 rounded-lg border border-white/10 text-gray-400 hover:text-white hover:border-white/30 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                >
                  <ChevronRight size={16} />
                </button>
              </div>
            )}
          </>
        )}
      </div>

      {/* ── Modal ── */}
      {showModal && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-zinc-900 border border-white/10 rounded-2xl w-full max-w-lg shadow-2xl max-h-[75vh] overflow-y-auto [&::-webkit-scrollbar]:w-1.5 [&::-webkit-scrollbar-track]:bg-transparent [&::-webkit-scrollbar-thumb]:bg-zinc-600 [&::-webkit-scrollbar-thumb]:rounded-full">
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
                      editFile ? 'border-green-500/50 text-green-400' : 'border-white/15 text-gray-500 hover:border-purple-500/50 hover:text-gray-300'
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
                <MultiSelect
                  items={artistItems}
                  selected={editArtistIds}
                  onChange={setEditArtistIds}
                  placeholder="Chọn ca sĩ..."
                />
              </div>

              {/* Hashtags */}
              <div>
                <label className="block text-xs text-gray-400 mb-1.5">Hashtag / Thể loại</label>
                <HashtagSelect
                  hashtags={hashtags}
                  selected={editHashtagIds}
                  onChange={setEditHashtagIds}
                  onCreateNew={handleCreateHashtag}
                />
                {editHashtagIds.length > 0 && (
                  <div className="flex flex-wrap gap-1.5 mt-2">
                    {editHashtagIds.map((hid) => {
                      const h = hashtags.find((x) => x.hashtag_id === hid);
                      return h ? (
                        <span key={hid}
                          className="flex items-center gap-1 px-2 py-0.5 bg-cyan-900/40 border border-cyan-700/40 rounded text-xs text-cyan-300">
                          #{h.name}
                          <button type="button" onClick={() => setEditHashtagIds((prev) => prev.filter((x) => x !== hid))}>
                            <X size={10} />
                          </button>
                        </span>
                      ) : null;
                    })}
                  </div>
                )}
              </div>

              {/* Status */}
              <div>
                <label className="block text-xs text-gray-400 mb-1.5">Trạng thái</label>
                <div className="flex gap-2">
                  {[
                    { v: 'active', label: 'Hoạt động', cls: 'border-green-500 bg-green-500/10 text-green-400' },
                    { v: 'pending', label: 'Chờ duyệt', cls: 'border-yellow-500 bg-yellow-500/10 text-yellow-400' },
                    { v: 'inactive', label: 'Tắt', cls: 'border-gray-500 bg-gray-500/10 text-gray-400' },
                  ].map(({ v, label, cls }) => (
                    <button key={v} type="button"
                      onClick={() => setEditStatus(v)}
                      className={`flex-1 py-2 rounded-lg border text-xs font-medium transition-all ${
                        editStatus === v ? cls : 'border-white/10 text-gray-600 hover:border-white/20'
                      }`}
                    >
                      {label}
                    </button>
                  ))}
                </div>
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
