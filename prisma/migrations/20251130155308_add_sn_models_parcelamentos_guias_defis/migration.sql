-- AlterTable
ALTER TABLE "Declaration" ADD COLUMN "authenticationCode" TEXT;
ALTER TABLE "Declaration" ADD COLUMN "operationType" TEXT;
ALTER TABLE "Declaration" ADD COLUMN "receipt" TEXT;
ALTER TABLE "Declaration" ADD COLUMN "regime" TEXT;
ALTER TABLE "Declaration" ADD COLUMN "revenueCash" REAL;
ALTER TABLE "Declaration" ADD COLUMN "revenueCompetence" REAL;

-- CreateTable
CREATE TABLE "Parcelamento" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "companyId" TEXT NOT NULL,
    "numero" TEXT NOT NULL,
    "situacao" TEXT NOT NULL,
    "valorTotal" REAL NOT NULL,
    "quantidadeParcelas" INTEGER NOT NULL,
    "tipo" TEXT,
    "dataPedido" DATETIME NOT NULL,
    "dataSituacao" DATETIME,
    CONSTRAINT "Parcelamento_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Parcela" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "parcelamentoId" TEXT NOT NULL,
    "numero" INTEGER NOT NULL,
    "vencimento" DATETIME NOT NULL,
    "valor" REAL NOT NULL,
    "situacao" TEXT NOT NULL,
    "pagoEm" DATETIME,
    "valorPago" REAL,
    CONSTRAINT "Parcela_parcelamentoId_fkey" FOREIGN KEY ("parcelamentoId") REFERENCES "Parcelamento" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Guia" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "companyId" TEXT NOT NULL,
    "numero" TEXT NOT NULL,
    "periodo" TEXT NOT NULL,
    "dataEmissao" DATETIME NOT NULL,
    "vencimento" DATETIME NOT NULL,
    "situacao" TEXT NOT NULL,
    "valorPrincipal" REAL NOT NULL,
    "valorMulta" REAL NOT NULL,
    "valorJuros" REAL NOT NULL,
    "valorTotal" REAL NOT NULL,
    "pagoEm" DATETIME,
    "banco" TEXT,
    "agencia" TEXT,
    "valorPago" REAL,
    CONSTRAINT "Guia_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "GuiaTributo" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "guiaId" TEXT NOT NULL,
    "tipo" TEXT NOT NULL,
    "valorPrincipal" REAL NOT NULL,
    "valorJuros" REAL NOT NULL,
    "valorMulta" REAL NOT NULL,
    CONSTRAINT "GuiaTributo_guiaId_fkey" FOREIGN KEY ("guiaId") REFERENCES "Guia" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Defis" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "companyId" TEXT NOT NULL,
    "exercicio" INTEGER NOT NULL,
    "recibo" TEXT,
    "identificador" TEXT,
    "codigoAutenticacao" TEXT,
    "tipo" TEXT,
    "transmitidoEm" DATETIME,
    "rendimentosSocios" REAL,
    CONSTRAINT "Defis_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "DefisSocio" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "defisId" TEXT NOT NULL,
    "socioNome" TEXT,
    "socioCpf" TEXT,
    "rendimento" REAL,
    "participacao" REAL,
    CONSTRAINT "DefisSocio_defisId_fkey" FOREIGN KEY ("defisId") REFERENCES "Defis" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_EnquadramentoHistory" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "companyId" TEXT NOT NULL,
    "regime" TEXT NOT NULL,
    "isMei" BOOLEAN NOT NULL DEFAULT false,
    "startDate" DATETIME NOT NULL,
    "endDate" DATETIME,
    "reason" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "EnquadramentoHistory_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_EnquadramentoHistory" ("companyId", "createdAt", "endDate", "id", "reason", "regime", "startDate") SELECT "companyId", "createdAt", "endDate", "id", "reason", "regime", "startDate" FROM "EnquadramentoHistory";
DROP TABLE "EnquadramentoHistory";
ALTER TABLE "new_EnquadramentoHistory" RENAME TO "EnquadramentoHistory";
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
