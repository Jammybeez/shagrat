"use client";

import Image from "next/image";

import { avatarLabel, avatars, type AvatarId } from "~/lib/avatars";

/** A member's avatar, or their initial if they have yet to choose a face. */
export function Avatar({
  avatar,
  name,
  size,
}: {
  avatar: string | null;
  name: string;
  size: number;
}) {
  if (!avatar) {
    return (
      <span
        style={{ width: size, height: size, fontSize: size * 0.45 }}
        className="flex shrink-0 items-center justify-center rounded-full border border-red-900/60 bg-stone-800 font-display text-stone-300"
        aria-label={name}
      >
        {name.charAt(0).toUpperCase()}
      </span>
    );
  }

  return (
    <span style={{ width: size, height: size }} className="relative block shrink-0">
      <Image
        src={`/avatars/${avatar}.png`}
        alt={`${name}: ${avatarLabel(avatar)}`}
        title={avatarLabel(avatar)}
        fill
        sizes={`${size}px`}
        className="object-contain"
      />
    </span>
  );
}

/** A grid of every avatar. Clicking one calls onPick. */
export function AvatarPicker({
  value,
  onPick,
}: {
  value: string | null;
  onPick: (id: AvatarId) => void;
}) {
  return (
    <div className="grid grid-cols-5 gap-1 rounded-md border border-stone-700 bg-stone-950 p-2">
      {avatars.map((a) => (
        <button
          key={a.id}
          type="button"
          onClick={() => onPick(a.id)}
          title={a.label}
          aria-pressed={value === a.id}
          className={`flex items-center justify-center rounded-md p-1 transition hover:bg-stone-800 ${
            value === a.id ? "bg-red-900/40 ring-2 ring-ember" : ""
          }`}
        >
          <Avatar avatar={a.id} name={a.label} size={48} />
        </button>
      ))}
    </div>
  );
}
