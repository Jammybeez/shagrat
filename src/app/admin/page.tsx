import { db } from "@/lib/db";
import { addUser, updateUser, deleteUser } from "../actions";
import { Button } from "@/components/ui/button";

export const dynamic = "force-dynamic";

function toLocalDatetimeValue(date: Date) {
  const d = new Date(date);
  d.setMinutes(d.getMinutes() - d.getTimezoneOffset());
  return d.toISOString().slice(0, 16);
}

export default async function AdminPage() {
  const users = await db.user.findMany({ orderBy: { id: "asc" } });

  return (
    <main className="p-6 space-y-8">

      {/* Add user */}
      <section className="p-4 border rounded space-y-3 max-w-lg">
        <h2 className="font-semibold">Add User</h2>
        <form action={addUser} className="flex gap-2">
          <input
            name="userName"
            placeholder="User name"
            className="border p-2 rounded flex-1"
            required
          />
          <Button type="submit" className="bg-blue-600 text-white px-4 py-2 rounded">
            Add
          </Button>
        </form>
      </section>

      <section className="overflow-x-auto">
        <table className="min-w-full border rounded overflow-hidden">
          <thead className="bg-gray-500">
            <tr>
              <th className="text-left p-2 border-b">ID</th>
              <th className="text-left p-2 border-b">User</th>
              <th className="text-left p-2 border-b">Total</th>
              <th className="text-left p-2 border-b">Last Purchase</th>
              <th className="text-left p-2 border-b">Actions</th>
            </tr>
          </thead>
          <tbody>
            {users.map((u) => (
              <tr key={u.id} className="odd:bg-gray-600 even:bg-gray-500 align-top">
                <td className="p-2 border-b">{u.id}</td>
                <td className="p-2 border-b">
                  <form action={updateUser} className="flex gap-2 items-center">
                    <input type="hidden" name="id" value={u.id} />
                    <input
                      name="userName"
                      defaultValue={u.userName}
                      className="border p-1 rounded"
                      required
                    />
                    <input
                      name="totalPurchases"
                      type="number"
                      min={0}
                      defaultValue={u.totalPurchases}
                      className="border p-1 rounded w-24"
                      required
                    />
                    <input
                      name="lastPurchase"
                      type="datetime-local"
                      defaultValue={toLocalDatetimeValue(u.lastPurchase)}
                      className="border p-1 rounded"
                      required
                    />
                    <Button className="bg-emerald-600 text-white px-3 py-1 rounded">
                      Save
                    </Button>
                  </form>
                </td>
                <td className="p-2 border-b"></td>
                <td className="p-2 border-b"></td>
                <td className="p-2 border-b">
                  <form action={deleteUser}>
                    <input type="hidden" name="id" value={u.id} />
                    <Button className="bg-red-600 text-white px-3 py-1 rounded">
                      Delete
                    </Button>
                  </form>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>
    </main>
  );
}



