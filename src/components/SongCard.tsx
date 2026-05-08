import React, { useState, type MouseEvent } from 'react';
import { createPortal } from 'react-dom';
import { useNavigate } from 'react-router-dom';
import { Play, Heart, Headset, MoreHorizontal, ListPlus, PlusCircle } from 'lucide-react';
import { usePlayback } from '../context/PlaybackContext';
import { toPlaybackSong } from './MusicPlayer';
import SongCoverImage from './SongCoverImage';
import SongHashtagChips, { type SongHashtag } from './SongHashtagChips';
import type { SongCoverFields } from '../lib/songCover';

export interface SongCardSong extends SongCoverFields {
  song_id: number;
  title: string;
  artist?: string;
  artists?: Array<{ artist_id: number; artist_name: string }>;
  play_count?: number;
  hashtags?: SongHashtag[];
}

interface SongCardProps {
  song: SongCardSong;
  contextSongs?: SongCardSong[];
  rankBadge?: number;
  isFavorite?: boolean;
  onToggleFavorite?: () => void;
  onAddToPlaylist?: (e: MouseEvent) => void;
  showPlayCount?: boolean;
  compact?: boolean;
}

export default function SongCard({
  song,
  contextSongs,
  rankBadge,
  isFavorite,
  onToggleFavorite,
  onAddToPlaylist,
  showPlayCount,
  compact,
}: SongCardProps) {
  const navigate = useNavigate();
  const { playTrackInList, addToQueue } = usePlayback();
  const [menuOpen, setMenuOpen] = useState(false);
  const [menuPos, setMenuPos] = useState({ x: 0, y: 0 });

  const MENU_W = 208; // w-52
  const GAP = 8;

  const handlePlay = (e: MouseEvent) => {
    e.stopPropagation();
    playTrackInList([toPlaybackSong(song)], Number(song.song_id));
  };

  const openMenu = (e: MouseEvent) => {
    e.stopPropagation();
    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
    setMenuPos({
      x: Math.min(rect.right + GAP, window.innerWidth - MENU_W - GAP),
      y: rect.top,
    });
    setMenuOpen(true);
  };

  const artistName = song.artists?.length
    ? song.artists.map((a) => a.artist_name).join(', ')
    : (song.artist ?? '');

  const iconSz = compact ? 'w-3.5 h-3.5' : 'w-5 h-5';
  const btnBase = `rounded-full transition-colors bg-white/15 hover:bg-white/25 ${compact ? 'p-1.5' : 'p-2.5'}`;

  return (
    <>
      <div
        onClick={() => navigate(`/song/${song.song_id}`)}
        className={`group relative overflow-hidden cursor-pointer transition-all bg-zinc-900 hover:bg-zinc-800 border border-transparent hover:border-white/10 ${
          compact ? 'p-1 sm:p-1.5 rounded-md' : 'p-4 rounded-xl'
        }`}
      >
        {/* Cover image */}
        <div className={`relative aspect-square overflow-hidden rounded-lg ${compact ? 'mb-1' : 'mb-4'}`}>
          <SongCoverImage
            song={song}
            className={`w-full h-full object-cover transition-transform duration-300 ${
              compact ? 'group-hover:scale-[1.02]' : 'group-hover:scale-110 duration-500'
            }`}
          />
          {rankBadge != null && (
            <div className="absolute top-2 left-2 bg-black/60 backdrop-blur-md px-2 py-1 rounded text-[10px] font-bold text-white">
              #{rankBadge}
            </div>
          )}
        </div>

        {/* Text */}
        <h3
          className={`font-bold text-white truncate ${
            compact
              ? 'text-[9px] sm:text-[10px] leading-snug line-clamp-2 min-h-[1.625rem] sm:min-h-[1.875rem]'
              : ''
          }`}
        >
          {song.title}
        </h3>
        <p
          className={`text-gray-400 truncate mt-px ${
            compact ? 'text-[8px] sm:text-[9px] leading-tight' : 'text-sm'
          }`}
        >
          {artistName || 'Chưa xác định'}
        </p>
        <div
          className={
            compact
              ? 'mt-px min-h-0 scale-75 origin-top-left -translate-y-px max-w-[120%]'
              : 'mb-2 min-h-[1.125rem]'
          }
        >
          <SongHashtagChips hashtags={song.hashtags} maxVisible={compact ? 1 : 2} dense />
        </div>
        {showPlayCount && (
          <div className="flex items-center gap-2 text-[11px] text-purple-400 font-medium mt-1">
            <Headset size={14} />
            <span>{(song.play_count ?? 0).toLocaleString()} lượt nghe</span>
          </div>
        )}

        {/* Hover overlay — 3 buttons in a row */}
        <div
          className={`absolute inset-0 bg-black/70 transition-opacity flex items-center justify-center ${
            compact ? 'gap-2' : 'gap-3'
          } ${menuOpen ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'}`}
        >
          {/* Left: Heart */}
          <button
            type="button"
            onClick={(e) => { e.stopPropagation(); onToggleFavorite?.(); }}
            title={isFavorite ? 'Bỏ yêu thích' : 'Yêu thích'}
            className={`rounded-full transition-colors hover:cursor-pointer ${
              isFavorite ? 'bg-red-500 hover:bg-red-400' : 'bg-white/15 hover:bg-white/25'
            } ${compact ? 'p-1.5' : 'p-2.5'}`}
          >
            <Heart className={`text-white ${isFavorite ? 'fill-white' : ''} ${iconSz}`} />
          </button>

          {/* Center: Play */}
          <button
            type="button"
            onClick={handlePlay}
            className={`bg-purple-600 hover:bg-purple-500 rounded-full shadow-lg transition-all hover:scale-110 hover:cursor-pointer ${
              compact ? 'p-2' : 'p-3'
            }`}
          >
            <Play className={`fill-white text-white ${compact ? 'w-4 h-4' : 'w-5 h-5'}`} />
          </button>

          {/* Right: 3-dot menu */}
          <button
            type="button"
            onClick={openMenu}
            title="Tùy chọn"
            className={`rounded-full transition-colors hover:cursor-pointer ${btnBase}`}
          >
            <MoreHorizontal className={`text-white ${iconSz}`} />
          </button>
        </div>
      </div>

      {/* Dropdown portal */}
      {menuOpen && createPortal(
        <>
          <div
            className="fixed inset-0 z-[100]"
            onClick={() => setMenuOpen(false)}
          />
          <div
            className="fixed z-[101] bg-zinc-800 border border-white/10 rounded-xl shadow-2xl py-1 w-58 overflow-hidden"
            style={{ left: menuPos.x, top: menuPos.y }}
          >
            <button
              type="button"
              className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-white hover:bg-zinc-700 transition-colors text-left"
              onClick={(e) => {
                e.stopPropagation();
                addToQueue(toPlaybackSong(song));
                setMenuOpen(false);
              }}
            >
              <ListPlus size={16} className="text-purple-400 shrink-0" />
              Thêm vào danh sách chờ
            </button>
            {onAddToPlaylist && (
              <button
                type="button"
                className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-white hover:bg-zinc-700 transition-colors text-left"
                onClick={(e) => {
                  e.stopPropagation();
                  onAddToPlaylist(e);
                  setMenuOpen(false);
                }}
              >
                <PlusCircle size={16} className="text-green-400 shrink-0" />
                Thêm vào playlist
              </button>
            )}
          </div>
        </>,
        document.body,
      )}
    </>
  );
}
