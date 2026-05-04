import React from 'react';

export interface SongHashtag {
  hashtag_id: number;
  name?: string;
}

function labelFor(h: SongHashtag): string {
  const raw = typeof h.name === 'string' ? h.name.trim() : '';
  const withoutHash = raw.startsWith('#') ? raw.slice(1) : raw;
  const id =
    typeof h.hashtag_id === 'number' && !Number.isNaN(h.hashtag_id) ? h.hashtag_id : null;
  const inner = withoutHash || (id !== null ? String(id) : '');
  return inner ? `#${inner}` : '';
}

/** Hashtag badges: chỉ một dòng có thể cắt; maxVisible=null → hiển thị hết */
export default function SongHashtagChips({
  hashtags,
  maxVisible = 2,
  dense,
  className = '',
}: {
  hashtags?: SongHashtag[] | null;
  maxVisible?: number | null;
  dense?: boolean;
  className?: string;
}) {
  if (!hashtags?.length) return null;

  const showAll = maxVisible == null;
  const visible = showAll ? hashtags : hashtags.slice(0, Math.max(0, maxVisible));
  const remainder = showAll ? 0 : Math.max(0, hashtags.length - visible.length);

  const pill =
    dense
      ? 'px-1.5 py-0.5 rounded-md text-[10px]'
      : 'px-2 py-1 rounded-full text-[11px] sm:text-xs';

  return (
    <div className={`flex flex-wrap gap-1.5 ${className}`}>
      {visible.map((h) => {
        const text = labelFor(h);
        if (!text) return null;
        return (
          <span
            key={h.hashtag_id}
            className={`bg-purple-500/15 text-purple-300/95 border border-purple-500/25 ${pill} shrink-0 max-w-[8rem] truncate`}
            title={text}
          >
            {text}
          </span>
        );
      })}
      {!showAll && remainder > 0 && (
        <span
          className={`text-gray-500 ${dense ? 'text-[10px]' : 'text-xs'} self-center shrink-0`}
        >
          ...
        </span>
      )}
    </div>
  );
}
