import { X, Repeat, Repeat1, Volume2, Music, ListMusic, Sparkles } from 'lucide-react';
import type { PlayerSong } from './MusicPlayer';
import type { LoopMode } from '../context/PlaybackContext';
import { getSongItemImageSrc } from '../lib/songCover';

const FALLBACK_COVER = 'https://images.unsplash.com/photo-1493225255756-d9584f8606e9?w=300';

interface QueuePanelProps {
  queue: PlayerSong[];
  currentIndex: number;
  manualQueue: PlayerSong[];
  suggestions: PlayerSong[];
  loopMode: LoopMode;
  onCycleLoop: () => void;
  onClose: () => void;
  onPlayIndex: (idx: number) => void;
  onPlayFromManualQueue: (manualIdx: number) => void;
  onPlaySuggestion: (idx: number) => void;
}

const LOOP_LABEL: Record<LoopMode, string> = {
  none: 'Không lặp',
  all: 'Lặp tất cả',
  one: 'Lặp 1 bài',
};

function SongRow({
  song,
  isCurrent,
  label,
  dim,
  onClick,
}: {
  song: PlayerSong;
  isCurrent?: boolean;
  label?: string;
  dim?: boolean;
  onClick: () => void;
}) {
  const cover = getSongItemImageSrc(song, FALLBACK_COVER);
  return (
    <button
      type="button"
      onClick={onClick}
      className={`w-full flex items-center gap-3 px-4 py-2.5 text-left transition-colors cursor-pointer ${
        isCurrent
          ? 'bg-purple-500/20 border-l-2 border-purple-400'
          : 'hover:bg-white/5 border-l-2 border-transparent'
      }`}
    >
      <div className="relative shrink-0">
        <img
          src={cover}
          alt={song.title}
          onError={(e) => { (e.target as HTMLImageElement).src = FALLBACK_COVER; }}
          className={`w-9 h-9 rounded-md object-cover ${dim ? 'opacity-50' : ''}`}
        />
        {isCurrent && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/50 rounded-md">
            <Volume2 size={14} className="text-purple-400 animate-pulse" />
          </div>
        )}
      </div>
      <div className="flex-1 min-w-0">
        <p className={`text-xs font-medium truncate ${
          isCurrent ? 'text-purple-300' : dim ? 'text-gray-500' : 'text-white'
        }`}>
          {song.title}
        </p>
        <p className={`text-[11px] truncate ${dim ? 'text-gray-600' : 'text-gray-500'}`}>
          {song.artist || 'Chưa xác định'}
        </p>
      </div>
      {label && <span className="text-[11px] text-gray-600 shrink-0">{label}</span>}
    </button>
  );
}

function SectionHeader({ icon, text, count }: { icon: React.ReactNode; text: string; count?: number }) {
  return (
    <div className="flex items-center gap-1.5 px-4 pt-3 pb-1.5">
      <span className="text-[11px] font-semibold text-gray-500 uppercase tracking-wider flex items-center gap-1.5">
        {icon}{text}
      </span>
      {count != null && (
        <span className="ml-auto text-[11px] text-gray-600">{count}</span>
      )}
    </div>
  );
}

export default function QueuePanel({
  queue,
  currentIndex,
  manualQueue,
  suggestions,
  loopMode,
  onCycleLoop,
  onClose,
  onPlayIndex,
  onPlayFromManualQueue,
  onPlaySuggestion,
}: QueuePanelProps) {
  return (
    <div className="fixed right-0 top-0 bottom-[100px] w-72 bg-zinc-900/95 backdrop-blur-xl border-l border-white/10 z-40 flex flex-col shadow-2xl ">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-white/10 shrink-0">
        <span className="font-semibold text-sm text-white">Hàng đợi phát</span>
        <div className="flex items-center gap-2">
          <button
            onClick={onCycleLoop}
            title={LOOP_LABEL[loopMode]}
            className={`p-1.5 rounded-lg cursor-pointer transition-colors ${
              loopMode !== 'none' ? 'text-purple-400' : 'text-gray-500 hover:text-white'
            }`}
          >
            {loopMode === 'one' ? <Repeat1 size={16} /> : <Repeat size={16} />}
          </button>
          <button onClick={onClose} className="p-1.5 rounded-lg text-gray-500 hover:text-white transition-colors cursor-pointer">
            <X size={16} />
          </button>
        </div>
      </div>

      {loopMode !== 'none' && (
        <div className="mx-4 mt-3 px-3 py-1.5 bg-purple-500/10 border border-purple-500/20 rounded-lg text-xs text-purple-400 flex items-center gap-1.5 shrink-0">
          {loopMode === 'one' ? <Repeat1 size={12} /> : <Repeat size={12} />}
          {LOOP_LABEL[loopMode]}
        </div>
      )}

      <div className="flex-1 overflow-y-auto  [&::-webkit-scrollbar]:w-1.5 [&::-webkit-scrollbar-track]:bg-transparent [&::-webkit-scrollbar-thumb]:bg-zinc-600 [&::-webkit-scrollbar-thumb]:rounded-full">
        {/* ── 1. Đang phát ────────────────────────────────────────────────── */}
        <SectionHeader icon={<Music size={11} />} text="Đang phát" count={queue.length} />
        {queue.length === 0 ? (
          <div className="flex flex-col items-center py-6 gap-2 text-gray-700">
            <Music size={24} />
            <p className="text-xs">Chưa có bài nào</p>
          </div>
        ) : (
          queue.map((song, idx) => (
            <SongRow
              key={`q-${song.song_id}-${idx}`}
              song={song}
              isCurrent={idx === currentIndex}
              label={String(idx + 1)}
              onClick={() => onPlayIndex(idx)}
            />
          ))
        )}

        {/* ── 2. Danh sách chờ (chỉ hiện khi có bài) ──────────────────────── */}
        {manualQueue.length > 0 && (
          <>
            <div className="mx-4 mt-2 border-t border-white/10" />
            <SectionHeader icon={<ListMusic size={11} />} text="Danh sách chờ" count={manualQueue.length} />
            {manualQueue.map((song, idx) => (
              <SongRow
                key={`mq-${song.song_id}-${idx}`}
                song={song}
                label={String(idx + 1)}
                onClick={() => onPlayFromManualQueue(idx)}
              />
            ))}
          </>
        )}

        {/* ── 3. Gợi ý (luôn hiện) ────────────────────────────────────────── */}
        <div className="mx-4 mt-2 border-t border-white/10" />
        <SectionHeader icon={<Sparkles size={11} />} text="Gợi ý cho bạn" />
        {suggestions.length === 0 ? (
          <div className="flex flex-col items-center py-6 gap-2 text-gray-700">
            <Sparkles size={22} />
            <p className="text-xs">Đang tải gợi ý...</p>
          </div>
        ) : (
          suggestions.map((song, idx) => (
            <SongRow
              key={`sug-${song.song_id}-${idx}`}
              song={song}
              dim
              onClick={() => onPlaySuggestion(idx)}
            />
          ))
        )}
      </div>
    </div>
  );
}
