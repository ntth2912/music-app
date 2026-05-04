import { X, Repeat, Repeat1, Volume2, Music } from 'lucide-react';
import type { PlayerSong } from './MusicPlayer';
import type { LoopMode } from '../context/PlaybackContext';
import { getSongItemImageSrc } from '../lib/songCover';

const FALLBACK_COVER = 'https://images.unsplash.com/photo-1493225255756-d9584f8606e9?w=300';

interface QueuePanelProps {
  queue: PlayerSong[];
  currentIndex: number;
  loopMode: LoopMode;
  onCycleLoop: () => void;
  onClose: () => void;
  onPlayIndex: (idx: number) => void;
}

const LOOP_LABEL: Record<LoopMode, string> = {
  none: 'Không lặp',
  all: 'Lặp tất cả',
  one: 'Lặp 1 bài',
};

export default function QueuePanel({
  queue,
  currentIndex,
  loopMode,
  onCycleLoop,
  onClose,
  onPlayIndex,
}: QueuePanelProps) {
  return (
    <div className="fixed right-0 top-0 bottom-[81px] w-72 bg-zinc-900/95 backdrop-blur-xl border-l border-white/10 z-40 flex flex-col shadow-2xl">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-white/10 shrink-0">
        <span className="font-semibold text-sm text-white">Hàng đợi phát</span>
        <div className="flex items-center gap-2">
          <button
            onClick={onCycleLoop}
            title={LOOP_LABEL[loopMode]}
            className={`p-1.5 rounded-lg transition-colors ${
              loopMode !== 'none' ? 'text-purple-400' : 'text-gray-500 hover:text-white'
            }`}
          >
            {loopMode === 'one' ? <Repeat1 size={16} /> : <Repeat size={16} />}
          </button>
          <button onClick={onClose} className="p-1.5 rounded-lg text-gray-500 hover:text-white transition-colors">
            <X size={16} />
          </button>
        </div>
      </div>

      {/* Loop badge */}
      {loopMode !== 'none' && (
        <div className="mx-4 mt-3 px-3 py-1.5 bg-purple-500/10 border border-purple-500/20 rounded-lg text-xs text-purple-400 flex items-center gap-1.5 shrink-0">
          {loopMode === 'one' ? <Repeat1 size={12} /> : <Repeat size={12} />}
          {LOOP_LABEL[loopMode]}
        </div>
      )}

      {/* Song list */}
      <div className="flex-1 overflow-y-auto py-2">
        {queue.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full gap-3 text-gray-600">
            <Music size={36} />
            <p className="text-sm">Hàng đợi trống</p>
          </div>
        ) : (
          queue.map((song, idx) => {
            const isCurrent = idx === currentIndex;
            const cover = getSongItemImageSrc(song, FALLBACK_COVER);
            return (
              <button
                key={`${song.song_id}-${idx}`}
                type="button"
                onClick={() => onPlayIndex(idx)}
                className={`w-full flex items-center gap-3 px-4 py-2.5 text-left transition-colors ${
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
                    className="w-9 h-9 rounded-md object-cover"
                  />
                  {isCurrent && (
                    <div className="absolute inset-0 flex items-center justify-center bg-black/50 rounded-md">
                      <Volume2 size={14} className="text-purple-400 animate-pulse" />
                    </div>
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <p className={`text-xs font-medium truncate ${isCurrent ? 'text-purple-300' : 'text-white'}`}>
                    {song.title}
                  </p>
                  <p className="text-[11px] text-gray-500 truncate">{song.artist || 'Chưa xác định'}</p>
                </div>
                <span className="text-[11px] text-gray-600 shrink-0">{idx + 1}</span>
              </button>
            );
          })
        )}
      </div>
    </div>
  );
}
