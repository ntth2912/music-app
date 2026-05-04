/** Shape for API items that may carry artwork via `file_url`. */
export type SongCoverFields = {
  file_url?: string | null;
  cover_url?: string | null;
  coverUrl?: string | null;
  image_url?: string | null;
  thumbnail_url?: string | null;
  artwork_url?: string | null;
};

/**
 * URL dùng chung cho ảnh bài (card, list, player): **ưu tiên `file_url`**,
 * không có thì dùng `fallback`.
 */
export function getSongItemImageSrc(song: SongCoverFields, fallback: string): string {
  const f = typeof song.file_url === 'string' ? song.file_url.trim() : '';
  return f || fallback;
}
