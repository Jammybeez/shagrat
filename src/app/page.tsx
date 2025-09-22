
import { db } from "@/lib/db";
import { getRecommendedUserId, recordPurchase } from "./actions";
import { Button } from "@/components/ui/button"

export const dynamic = "force-dynamic"; // ensure fresh data during the demo

export default async function Home() {
  const [users, recommendedId] = await Promise.all([
    db.user.findMany({ orderBy: { lastPurchase: "asc" } }),
    getRecommendedUserId(),
  ]);

  return (
    <main className="p-6 space-y-8">
      <header className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Users</h1>
        <a
          href="/admin"
          className="text-sm underline underline-offset-4 hover:opacity-80"
        >
          Admin →
        </a>
      </header>

      <section className="p-4 border rounded space-y-3">
        <h2 className="font-semibold">Who should go next?</h2>
        <p className="text-sm text-gray-600">
          Recommendation = oldest <code>lastPurchase</code> (ties randomized). Override anytime.
        </p>

        <form action={recordPurchase} className="flex items-center gap-3">
          <select
            name="userId"
            defaultValue={recommendedId ?? ""}
            className="border rounded p-2 min-w-56"
          >
            <option value="" disabled>
              {users.length ? "Select a user" : "No users yet"}
            </option>
            {users.map((u) => (
              <option key={u.id} value={u.id}>
                {u.userName} — last: {new Date(u.lastPurchase).toLocaleString()} — total: {u.totalPurchases}
              </option>
            ))}
          </select>

          <Button
            type="submit"
            className="bg-green-600 text-white px-4 py-2 rounded disabled:opacity-50 cursor-pointer"
            disabled={!users.length}
            title="Record purchase for selected user"
          >
            Record Purchase
          </Button>

          {recommendedId && (
            <span className="text-xs px-2 py-1 rounded bg-amber-100 border">
              Recommended ID: {recommendedId}
            </span>
          )}
        </form>
      </section>

      <section className="overflow-x-auto">
        <table className="min-w-full border rounded overflow-hidden">
          <thead className="bg-gray-500">
            <tr>
              <th className="text-left p-2 border-b">ID</th>
              <th className="text-left p-2 border-b">User</th>
              <th className="text-left p-2 border-b">Total Purchases</th>
              <th className="text-left p-2 border-b">Last Purchase</th>
            </tr>
          </thead>
          <tbody>
            {users.map((u) => (
              <tr key={u.id} className="odd:bg-white even:bg-gray-500">
                <td className="p-2 border-b">{u.id}</td>
                <td className="p-2 border-b">{u.userName}</td>
                <td className="p-2 border-b">{u.totalPurchases}</td>
                <td className="p-2 border-b">{new Date(u.lastPurchase).toLocaleString()}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>
    </main>
  );
}
