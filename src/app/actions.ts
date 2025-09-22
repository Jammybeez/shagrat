"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";


export async function getRecommendedUserId(): Promise<number | null> {
  const users = await db.user.findMany({
    orderBy: [{ lastPurchase: "asc" }, { id: "asc" }],
  });
  if (!users.length) return null;

  const oldestDate = users[0].lastPurchase.getTime();
  const tied = users.filter(u => u.lastPurchase.getTime() === oldestDate);
  const pick = tied[Math.floor(Math.random() * tied.length)];
  return pick.id;
}


const addUserSchema = z.object({
  userName: z.string().trim().min(1, "User name is required"),
});

export async function addUser(formData: FormData) {
  const data = addUserSchema.parse({
    userName: formData.get("userName"),
  });

  await db.user.create({
    data: { userName: data.userName, totalPurchases: 0 },
  });

  revalidatePath("/");
  revalidatePath("/admin");
}

const updateUserSchema = z.object({
  id: z.coerce.number().int().positive(),
  userName: z.string().trim().min(1),
  totalPurchases: z.coerce.number().int().min(0),
  lastPurchase: z.coerce.date(),
});

export async function updateUser(formData: FormData) {
  const data = updateUserSchema.parse({
    id: formData.get("id"),
    userName: formData.get("userName"),
    totalPurchases: formData.get("totalPurchases"),
    lastPurchase: formData.get("lastPurchase"),
  });

  await db.user.update({
    where: { id: data.id },
    data: {
      userName: data.userName,
      totalPurchases: data.totalPurchases,
      lastPurchase: data.lastPurchase,
    },
  });

  revalidatePath("/");
  revalidatePath("/admin");
}

export async function deleteUser(formData: FormData) {
  const id = Number(formData.get("id"));
  if (!id) throw new Error("Missing id");

  await db.user.delete({ where: { id } });

  revalidatePath("/");
  revalidatePath("/admin");
}

export async function recordPurchase(formData: FormData) {
  const id = Number(formData.get("userId"));
  if (!id) throw new Error("Missing userId");

  await db.user.update({
    where: { id },
    data: {
      totalPurchases: { increment: 1 },
      lastPurchase: new Date(),
    },
  });

  revalidatePath("/");
}
