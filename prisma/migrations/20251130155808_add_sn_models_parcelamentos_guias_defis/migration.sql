-- AlterTable
ALTER TABLE "Invoice" ADD COLUMN "aliquotaIss" REAL;
ALTER TABLE "Invoice" ADD COLUMN "issRetido" BOOLEAN DEFAULT false;
ALTER TABLE "Invoice" ADD COLUMN "municipioPrestacao" TEXT;
ALTER TABLE "Invoice" ADD COLUMN "municipioTomador" TEXT;
ALTER TABLE "Invoice" ADD COLUMN "valorIssRetido" REAL;

-- CreateTable
CREATE TABLE "DasdDeclaration" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "companyId" TEXT NOT NULL,
    "period" TEXT NOT NULL,
    "deliveredAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "DasdDeclaration_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Company" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "cnpj" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "tradeName" TEXT,
    "issIsento" BOOLEAN NOT NULL DEFAULT false,
    "cnae" TEXT NOT NULL,
    "secondaryCnaes" TEXT,
    "regime" TEXT NOT NULL DEFAULT 'Simples Nacional',
    "status" TEXT NOT NULL DEFAULT 'Ativo',
    "riskLevel" TEXT NOT NULL DEFAULT 'Baixo',
    "address" TEXT,
    "phone" TEXT,
    "email" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);
INSERT INTO "new_Company" ("address", "cnae", "cnpj", "createdAt", "email", "id", "name", "phone", "regime", "riskLevel", "secondaryCnaes", "status", "tradeName", "updatedAt") SELECT "address", "cnae", "cnpj", "createdAt", "email", "id", "name", "phone", "regime", "riskLevel", "secondaryCnaes", "status", "tradeName", "updatedAt" FROM "Company";
DROP TABLE "Company";
ALTER TABLE "new_Company" RENAME TO "Company";
CREATE UNIQUE INDEX "Company_cnpj_key" ON "Company"("cnpj");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
