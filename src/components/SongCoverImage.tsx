import React, { useEffect, useState } from 'react';
import { getSongItemImageSrc, type SongCoverFields } from '../lib/songCover';

export const DEFAULT_SONG_COVER_FALLBACK =
  'https://images.unsplash.com/photo-1493225255756-d9584f8606e9?w=300';

export type SongCoverImageProps = {
  song?: SongCoverFields;
  /** If provided, skips automatic resolution from `song`. */
  src?: string | null;
  fallbackSrc?: string;
  className?: string;
  alt?: string;
};

const SongCoverImage = React.memo(function SongCoverImage({
  song,
  src,
  fallbackSrc = DEFAULT_SONG_COVER_FALLBACK,
  className,
  alt = '',
}: SongCoverImageProps) {
  const resolvedCover =
    src !== undefined && src !== null
      ? typeof src === 'string' && src.trim() !== ''
        ? src.trim()
        : null
      : song
        ? getSongItemImageSrc(song, fallbackSrc)
        : null;

  const [imgSrc, setImgSrc] = useState(() => resolvedCover ?? fallbackSrc);

  useEffect(() => {
    setImgSrc(resolvedCover ?? fallbackSrc);
  }, [resolvedCover, fallbackSrc]);

  return (
    <img
      src={imgSrc}
      alt={alt}
      className={className}
      loading="lazy"
      decoding="async"
      onError={() =>
        setImgSrc((prev) => (prev === fallbackSrc ? prev : fallbackSrc))
      }
    />
  );
});

export default SongCoverImage;
