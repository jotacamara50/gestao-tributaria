/*
  Warnings:

  - A unique constraint covering the columns `[companyId,period]` on the table `DasdDeclaration` will be added. If there are existing duplicate values, this will fail.

*/
-- CreateIndex
CREATE UNIQUE INDEX "DasdDeclaration_companyId_period_key" ON "DasdDeclaration"("companyId", "period");
