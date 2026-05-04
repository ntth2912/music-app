import React, {
  useState,
  useEffect,
} from 'react';


const COVER_FALLBACK =
  'https://images.unsplash.com/photo-1493225255756-d9584f8606e9?w=300';

// ── Song cover image ──────────────────────────────────────────────────────────

const SongCoverImage = React.memo(function SongCoverImage({
  src,
  className,
}: {
  src?: string | null;
  className?: string;
}) {
  const normalized =
    typeof src === 'string' && src.trim() !== '' ? src.trim() : null;
  const [imgSrc, setImgSrc] = useState(() => normalized ?? COVER_FALLBACK);

  useEffect(() => {
    setImgSrc(normalized ?? COVER_FALLBACK);
  }, [normalized]);

  return (
    <img
      src={imgSrc}
      alt=""
      className={className}
      loading="lazy"
      decoding="async"
      onError={() =>
        setImgSrc((prev) => (prev === COVER_FALLBACK ? prev : COVER_FALLBACK))
      }
    />
  );
});

interface SongArtist {
  artist_id: number;
  artist_name: string;
}

interface Song {
  song_id: number;
  title: string;
  artist?: string;
  artists?: SongArtist[];
  album_id?: number | null;
  duration?: number | null;
  file_url?: string | null;
  lyrics?: string | null;
  status?: string | null;
  is_new?: number | null;
  play_count?: number;
  like_count?: number;
  isFavorite?: boolean;
}

export default function ListenerHome() {


  return (
   <div>Danh sách gợi ý</div>
  );
}