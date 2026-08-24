'use client';

const EMOJI = ['👍', '❤️', '😂', '😮', '😢', '🙏'];

export default function ReactionPicker({ onPick }: { onPick: (emoji: string) => void }) {
  return (
    <div className="flex items-center gap-1 rounded-full border border-slate-100 bg-white px-2 py-1 shadow-lg">
      {EMOJI.map((emoji) => (
        <button
          key={emoji}
          onClick={() => onPick(emoji)}
          className="flex h-7 w-7 items-center justify-center rounded-full text-base hover:scale-125 transition-transform"
        >
          {emoji}
        </button>
      ))}
    </div>
  );
}
