/*
  Warnings:

  - Added the required column `cpf` to the `User` table without a default value. This is not possible if the table is not empty.

*/
-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_User" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "password" TEXT NOT NULL,
    "role" TEXT NOT NULL DEFAULT 'AUDITOR',
    "mfaEnabled" BOOLEAN NOT NULL DEFAULT false,
    "mfaSecret" TEXT,
    "cpf" TEXT NOT NULL,
    "matricula" TEXT,
    "cargo" TEXT,
    "localTrabalho" TEXT,
    "phone" TEXT,
    "profiles" TEXT,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);
INSERT INTO "new_User" ("createdAt", "email", "id", "mfaEnabled", "mfaSecret", "name", "password", "role", "updatedAt", "cpf", "matricula", "cargo", "localTrabalho", "phone", "profiles", "active")
SELECT "createdAt", "email", "id", "mfaEnabled", "mfaSecret", "name", "password", "role", "updatedAt", '00000000000' as "cpf", NULL as "matricula", NULL as "cargo", NULL as "localTrabalho", NULL as "phone", NULL as "profiles", true as "active" FROM "User";
DROP TABLE "User";
ALTER TABLE "new_User" RENAME TO "User";
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");
CREATE UNIQUE INDEX "User_cpf_key" ON "User"("cpf");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
