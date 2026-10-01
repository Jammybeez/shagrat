"use client";

import { useEffect, useState } from "react";

import { randomAvatarId, type AvatarId } from "~/lib/avatars";
import { api } from "~/trpc/react";
import { Avatar, AvatarPicker } from "./avatar";
import { Wheel } from "./wheel";

function formatWeek(weekOf: string) {
  return new Date(`${weekOf}T00:00:00Z`).toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
    timeZone: "UTC",
  });
}

const card =
  "rounded-xl border border-red-900/50 bg-stone-900/80 p-6 shadow-[0_0_40px_-15px] shadow-red-700/40";

/**
 * localStorage key marking that this viewer has watched a pick's spin. Includes the creation time
 * because ids restart after a database reset, and an old "spun" mark must not reveal a new pick.
 */
function seenKey(pick: { id: number; createdAt: Date }) {
  return `shagrat:spun:${pick.id}:${pick.createdAt.getTime()}`;
}

export function Dashboard() {
  const [pick] = api.pick.current.useSuspenseQuery();
  const [members] = api.member.list.useSuspenseQuery();
  const [history] = api.pick.history.useSuspenseQuery();
  const [extras] = api.pick.extras.useSuspenseQuery();

  // This week's buyers in the order they were chosen: the Sunday pick, then any extras.
  const week = pick ? [pick, ...extras] : [];

  // Which of them this viewer has watched being spun. Until localStorage is read, assume none,
  // so nobody's name leaks before the wheel has had its moment.
  const [seen, setSeen] = useState<Set<number>>(new Set());
  const weekKeys = week.map(seenKey).join(",");
  useEffect(() => {
    const ids = new Set<number>();
    for (const key of weekKeys.split(",").filter(Boolean)) {
      try {
        if (localStorage.getItem(key) !== null) ids.add(Number(key.split(":")[2]));
      } catch {}
    }
    setSeen(ids);
  }, [weekKeys]);
  const markSeen = (p: (typeof week)[number]) => {
    try {
      localStorage.setItem(seenKey(p), "1");
    } catch {}
    setSeen((s) => new Set(s).add(p.id));
  };

  // A pick made by this viewer ("More milk now!" or re-roll) spins without waiting for a click.
  const [autoSpinId, setAutoSpinId] = useState<number | null>(null);

  const utils = api.useUtils();
  const refresh = () => utils.invalidate();
  const reroll = api.pick.reroll.useMutation({
    onSuccess: async (p) => {
      if (p) setAutoSpinId(p.id);
      await refresh();
    },
  });
  const more = api.pick.more.useMutation({
    onSuccess: (p) => setAutoSpinId(p.id),
    onSettled: refresh,
  });

  // The big wheel is for the Sunday pick. The little wheel is for extras: it spins for the first
  // one this viewer hasn't seen, or rests on the latest.
  const extraTarget = extras.find((p) => !seen.has(p.id)) ?? extras.at(-1);
  const pending = week.some((p) => !seen.has(p.id));

  // Everyone who could have been chosen goes on a wheel (not those already buying this week, which
  // is why the little wheel has fewer slices), plus the victim if they've since fled.
  function wheelFor(target: (typeof week)[number]) {
    const earlier = new Set(week.filter((p) => p.round < target.round).map((p) => p.memberId));
    const names: string[] = [];
    let winnerIndex = -1;
    for (const m of members) {
      if (earlier.has(m.id)) continue;
      if (m.id === target.memberId) winnerIndex = names.length;
      names.push(m.name);
    }
    if (winnerIndex === -1) {
      winnerIndex = names.length;
      names.push(target.member.name);
    }
    return { names, winnerIndex };
  }

  // "They're on holiday": re-rolls just this buyer; the replacement spins straight away.
  function holiday(p: (typeof week)[number]) {
    const busy = reroll.isPending && reroll.variables?.round === p.round;
    return (
      <button
        onClick={() => {
          if (confirm(`Defy Shagrat and spare ${p.member.name} this time?`)) {
            reroll.mutate({ round: p.round });
          }
        }}
        disabled={reroll.isPending}
        className="text-sm text-stone-500 underline decoration-dotted hover:text-stone-300 disabled:opacity-50"
      >
        {busy ? "Shagrat is reconsidering..." : "They're on holiday. Re-roll."}
      </button>
    );
  }

  const revealedExtras = extras.filter((p) => seen.has(p.id));
  // Don't let the Hall of Shame spoil this week's spins either.
  const shownHistory = history.filter((p) => !pick || p.weekOf !== pick.weekOf || seen.has(p.id));

  return (
    <div className="grid gap-8 lg:grid-cols-[1fr_380px]">
      <section className={`${card} flex flex-col items-center gap-6 text-center`}>
        {pick ? (
          <>
            <h2 className="font-display text-2xl text-stone-300">
              Milk-bearer for the week of {formatWeek(pick.weekOf)}
            </h2>
            <Wheel
              key={pick.id}
              {...wheelFor(pick)}
              alreadySpun={seen.has(pick.id)}
              autoSpin={pick.id === autoSpinId}
              onSpun={() => markSeen(pick)}
            />
            <div className={`min-h-28 transition-opacity duration-700 ${seen.has(pick.id) ? "opacity-100" : "opacity-0"}`}>
              {seen.has(pick.id) && (
                <>
                  <div className="flex items-center justify-center gap-4">
                    <Avatar avatar={pick.member.avatar} name={pick.member.name} size={96} />
                    <p className="font-display text-4xl font-bold text-ember">{pick.member.name}</p>
                  </div>
                  <p className="mx-auto mt-3 max-w-md text-stone-300 italic">{pick.decree}</p>
                  {pick.member.favouriteMilk && (
                    <p className="mt-2 text-sm text-stone-400">
                      Known to favour: {pick.member.favouriteMilk}
                    </p>
                  )}
                  {!pending && <div className="mt-3">{holiday(pick)}</div>}
                </>
              )}
            </div>
            {seen.has(pick.id) && extraTarget && (
              <div className="flex w-full max-w-md flex-col items-center gap-4 border-t border-stone-800 pt-6">
                <h3 className="font-display text-xl text-stone-300">More milk! Another runner is needed...</h3>
                {!seen.has(extraTarget.id) && extraTarget.id !== autoSpinId && (
                  <p className="-mt-2 text-sm text-stone-400">
                    Someone demanded more milk while you were away. Spin to see who else is sent.
                  </p>
                )}
                <Wheel
                  key={extraTarget.id}
                  small
                  {...wheelFor(extraTarget)}
                  alreadySpun={seen.has(extraTarget.id)}
                  autoSpin={extraTarget.id === autoSpinId}
                  onSpun={() => markSeen(extraTarget)}
                />
                {revealedExtras.length > 0 && (
                  <ul className="w-full space-y-3 text-left">
                    {revealedExtras.map((p) => (
                      <li key={p.id} className="flex items-center gap-3">
                        <Avatar avatar={p.member.avatar} name={p.member.name} size={48} />
                        <div className="min-w-0">
                          <p className="font-display text-xl font-bold text-ember">{p.member.name}</p>
                          <p className="text-sm text-stone-400 italic">{p.decree}</p>
                          {!pending && holiday(p)}
                        </div>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            )}
            {!pending && (
              <div className="flex flex-col items-center gap-3">
                <button
                  onClick={() => {
                    if (confirm("Send another orc for milk this week?")) more.mutate();
                  }}
                  disabled={more.isPending}
                  className="rounded-md bg-red-800 px-5 py-2 font-display text-lg font-semibold text-stone-100 transition hover:bg-red-700 disabled:opacity-50"
                >
                  {more.isPending ? "Summoning another runner..." : "More milk now!"}
                </button>
                {more.error && <p className="text-sm text-red-400">{more.error.message}</p>}
              </div>
            )}
          </>
        ) : (
          <div className="py-16">
            <p className="font-display text-2xl text-stone-300">The Tower stands empty.</p>
            <p className="mt-2 text-stone-400">
              Add some victims and Shagrat will choose one.
            </p>
          </div>
        )}
      </section>

      <div className="flex flex-col gap-8">
        <section className={card}>
          <h2 className="mb-4 font-display text-xl text-stone-200">The Warband</h2>
          <MemberForm onAdded={refresh} />
          <MemberList members={members} onChanged={refresh} />
        </section>

        <section className={card}>
          <h2 className="mb-4 font-display text-xl text-stone-200">Hall of Shame</h2>
          {shownHistory.length === 0 ? (
            <p className="text-sm text-stone-500">No milk has yet been fetched.</p>
          ) : (
            <ul className="space-y-1 text-sm">
              {shownHistory.map((p) => (
                <li key={p.id} className="flex items-center justify-between gap-4">
                  <span className="text-stone-500">
                    {formatWeek(p.weekOf)}
                    {p.round > 0 && <span className="ml-1 text-xs text-ember">+ more milk</span>}
                  </span>
                  <span className="flex items-center gap-2 text-stone-200">
                    {p.member.name}
                    <Avatar avatar={p.member.avatar} name={p.member.name} size={28} />
                  </span>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </div>
  );
}

function MemberForm({ onAdded }: { onAdded: () => Promise<void> }) {
  const [name, setName] = useState("");
  const [favouriteMilk, setFavouriteMilk] = useState("");
  const [excuse, setExcuse] = useState("");
  const [avatar, setAvatar] = useState<AvatarId | null>(null);
  const [choosing, setChoosing] = useState(false);
  // Pre-pick a random face after mount, so server and client render the same thing.
  useEffect(() => setAvatar(randomAvatarId()), []);
  const create = api.member.create.useMutation({
    onSuccess: async () => {
      setName("");
      setFavouriteMilk("");
      setExcuse("");
      setAvatar(randomAvatarId());
      setChoosing(false);
      await onAdded();
    },
  });

  const input =
    "w-full rounded-md border border-stone-700 bg-stone-950 px-3 py-2 text-sm text-stone-100 outline-none focus:border-ember";

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        create.mutate({ name, favouriteMilk, excuse, avatar: avatar ?? undefined });
      }}
      className="mb-6 flex flex-col gap-2"
    >
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={() => setChoosing((c) => !c)}
          title="Choose a face"
          className="shrink-0 rounded-md p-0.5 hover:bg-stone-800"
        >
          <Avatar avatar={avatar} name={name || "?"} size={40} />
        </button>
        <input className={input} placeholder="Name (required)" value={name} onChange={(e) => setName(e.target.value)} required maxLength={60} />
      </div>
      {choosing && (
        <AvatarPicker
          value={avatar}
          onPick={(id) => {
            setAvatar(id);
            setChoosing(false);
          }}
        />
      )}
      <input className={input} placeholder="Favourite milk (optional)" value={favouriteMilk} onChange={(e) => setFavouriteMilk(e.target.value)} maxLength={120} />
      <input className={input} placeholder="Signature excuse (optional)" value={excuse} onChange={(e) => setExcuse(e.target.value)} maxLength={120} />
      <button
        type="submit"
        disabled={create.isPending}
        className="rounded-md bg-red-800 px-4 py-2 text-sm font-semibold text-stone-100 transition hover:bg-red-700 disabled:opacity-50"
      >
        {create.isPending ? "Press-ganging..." : "Press-gang into service"}
      </button>
      {create.error && <p className="text-sm text-red-400">{create.error.message}</p>}
    </form>
  );
}

function MemberList({
  members,
  onChanged,
}: {
  members: {
    id: number;
    name: string;
    avatar: string | null;
    favouriteMilk: string | null;
    excuse: string | null;
    _count: { picks: number };
  }[];
  onChanged: () => Promise<void>;
}) {
  const retire = api.member.retire.useMutation({ onSuccess: onChanged });

  if (members.length === 0) {
    return <p className="text-sm text-stone-500">Nobody here but us orcs.</p>;
  }

  return (
    <ul className="divide-y divide-stone-800">
      {members.map((m) => (
        <li key={m.id} className="py-2">
          <div className="flex items-start gap-3">
            <Avatar avatar={m.avatar} name={m.name} size={40} />
            <div className="min-w-0 flex-1">
              <p className="font-medium text-stone-100">
                {m.name}{" "}
                <span className="text-xs text-stone-500">
                  ({m._count.picks} {m._count.picks === 1 ? "run" : "runs"})
                </span>
              </p>
              {m.favouriteMilk && <p className="truncate text-xs text-stone-400">🥛 {m.favouriteMilk}</p>}
              {m.excuse && <p className="truncate text-xs text-stone-500 italic">"{m.excuse}"</p>}
            </div>
            <button
              onClick={() => {
                if (confirm(`Banish ${m.name} to Mordor? They will never be picked again.`)) {
                  retire.mutate({ id: m.id });
                }
              }}
              className="shrink-0 text-xs text-stone-500 hover:text-red-400"
              title="Remove from the rota"
            >
              Banish
            </button>
          </div>
        </li>
      ))}
    </ul>
  );
}
