-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Pick" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "weekOf" TEXT NOT NULL,
    "round" INTEGER NOT NULL DEFAULT 0,
    "decree" TEXT NOT NULL,
    "memberId" INTEGER NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Pick_memberId_fkey" FOREIGN KEY ("memberId") REFERENCES "Member" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
INSERT INTO "new_Pick" ("createdAt", "decree", "id", "memberId", "weekOf") SELECT "createdAt", "decree", "id", "memberId", "weekOf" FROM "Pick";
DROP TABLE "Pick";
ALTER TABLE "new_Pick" RENAME TO "Pick";
CREATE INDEX "Pick_memberId_idx" ON "Pick"("memberId");
CREATE UNIQUE INDEX "Pick_weekOf_round_key" ON "Pick"("weekOf", "round");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
