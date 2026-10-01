"use client";

import { useState } from "react";

import { api } from "~/trpc/react";
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

export function Dashboard() {
  const [pick] = api.pick.current.useSuspenseQuery();
  const [members] = api.member.list.useSuspenseQuery();
  const [history] = api.pick.history.useSuspenseQuery();
  const [revealed, setRevealed] = useState(false);

  const utils = api.useUtils();
  const refresh = () => utils.invalidate();
  const reroll = api.pick.reroll.useMutation({ onSuccess: refresh });

  // Everyone eligible goes on the wheel, plus the victim if they've since fled.
  const names = members.map((m) => m.name);
  let winnerIndex = pick ? members.findIndex((m) => m.id === pick.memberId) : -1;
  if (pick && winnerIndex === -1) {
    names.push(pick.member.name);
    winnerIndex = names.length - 1;
  }

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
              pickId={pick.id}
              names={names}
              winnerIndex={winnerIndex}
              onRevealed={setRevealed}
            />
            <div className={`min-h-28 transition-opacity duration-700 ${revealed ? "opacity-100" : "opacity-0"}`}>
              <p className="font-display text-4xl font-bold text-ember">{pick.member.name}</p>
              <p className="mx-auto mt-3 max-w-md text-stone-300 italic">{pick.decree}</p>
              {pick.member.favouriteMilk && (
                <p className="mt-2 text-sm text-stone-400">
                  Known to favour: {pick.member.favouriteMilk}
                </p>
              )}
            </div>
            {revealed && (
              <button
                onClick={() => {
                  if (confirm("Defy Shagrat and re-roll this week's pick?")) reroll.mutate();
                }}
                disabled={reroll.isPending}
                className="text-sm text-stone-500 underline decoration-dotted hover:text-stone-300"
              >
                {reroll.isPending ? "Shagrat is reconsidering..." : "They're on holiday. Re-roll."}
              </button>
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
          {history.length === 0 ? (
            <p className="text-sm text-stone-500">No milk has yet been fetched.</p>
          ) : (
            <ul className="space-y-1 text-sm">
              {history.map((p) => (
                <li key={p.id} className="flex justify-between gap-4">
                  <span className="text-stone-500">{formatWeek(p.weekOf)}</span>
                  <span className="text-stone-200">{p.member.name}</span>
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
  const create = api.member.create.useMutation({
    onSuccess: async () => {
      setName("");
      setFavouriteMilk("");
      setExcuse("");
      await onAdded();
    },
  });

  const input =
    "w-full rounded-md border border-stone-700 bg-stone-950 px-3 py-2 text-sm text-stone-100 outline-none focus:border-ember";

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        create.mutate({ name, favouriteMilk, excuse });
      }}
      className="mb-6 flex flex-col gap-2"
    >
      <input className={input} placeholder="Name (required)" value={name} onChange={(e) => setName(e.target.value)} required maxLength={60} />
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
  members: { id: number; name: string; favouriteMilk: string | null; excuse: string | null; _count: { picks: number } }[];
  onChanged: () => Promise<void>;
}) {
  const retire = api.member.retire.useMutation({ onSuccess: onChanged });

  if (members.length === 0) {
    return <p className="text-sm text-stone-500">Nobody here but us orcs.</p>;
  }

  return (
    <ul className="divide-y divide-stone-800">
      {members.map((m) => (
        <li key={m.id} className="flex items-start justify-between gap-3 py-2">
          <div className="min-w-0">
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
        </li>
      ))}
    </ul>
  );
}
