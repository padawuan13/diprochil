/*
  Warnings:

  - You are about to drop the column `volumenEstimado` on the `Pedido` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE `Pedido` DROP COLUMN `volumenEstimado`,
    ADD COLUMN `cajas` INTEGER NOT NULL DEFAULT 0;
