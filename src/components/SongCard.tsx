import { useNavigate } from 'react-router-dom';
import { Play, Heart, PlusCircle, Headset } from 'lucide-react';
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
  /** Other songs in the same context (enables prev/next navigation while playing) */
  contextSongs?: SongCardSong[];
  rankBadge?: number;
  isFavorite?: boolean;
  onToggleFavorite?: () => void;
  onAddToPlaylist?: (e: React.MouseEvent) => void;
  showPlayCount?: boolean;
  /** Compact layout for dense grids (grid-cols-4) */
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
  const { playTrackInList } = usePlayback();

  const handlePlay = (e: React.MouseEvent) => {
    e.stopPropagation();
    const list = contextSongs?.length ? contextSongs : [song];
    playTrackInList(list.map(toPlaybackSong), Number(song.song_id));
  };

  const artistName = song.artists?.length
    ? song.artists.map((a) => a.artist_name).join(', ')
    : (song.artist ?? '');

  return (
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

      {/* Hover overlay */}
      <div className="absolute inset-0 bg-black/70 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center gap-2">
        <button
          type="button"
          onClick={handlePlay}
          className={`bg-purple-600 hover:bg-purple-500 rounded-full shadow-lg transition-all hover:scale-110 ${
            compact ? 'p-2.5' : 'p-3'
          }`}
        >
          <Play className={`fill-white text-white ${compact ? 'w-4 h-4' : 'w-5 h-5'}`} />
        </button>

        {(onToggleFavorite || onAddToPlaylist) && (
          <div className="flex items-center gap-2">
            {onToggleFavorite && (
              <button
                type="button"
                onClick={(e) => { e.stopPropagation(); onToggleFavorite(); }}
                title={isFavorite ? 'Bỏ yêu thích' : 'Yêu thích'}
                className={`rounded-full transition-colors ${
                  isFavorite ? 'bg-red-500 hover:bg-red-400' : 'bg-white/15 hover:bg-white/25'
                } ${compact ? 'p-1.5' : 'p-2'}`}
              >
                <Heart
                  className={`text-white ${isFavorite ? 'fill-white' : ''} ${
                    compact ? 'w-3.5 h-3.5' : 'w-4 h-4'
                  }`}
                />
              </button>
            )}
            {onAddToPlaylist && (
              <button
                type="button"
                onClick={(e) => { e.stopPropagation(); onAddToPlaylist(e); }}
                title="Thêm vào playlist"
                className={`bg-white/15 hover:bg-white/25 rounded-full transition-colors ${
                  compact ? 'p-1.5' : 'p-2'
                }`}
              >
                <PlusCircle className={`text-white ${compact ? 'w-3.5 h-3.5' : 'w-4 h-4'}`} />
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
