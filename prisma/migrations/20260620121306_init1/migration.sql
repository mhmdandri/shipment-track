/*
  Warnings:

  - A unique constraint covering the columns `[shipmentId,stepOrder]` on the table `ShipmentTask` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `updatedAt` to the `Reminder` table without a default value. This is not possible if the table is not empty.
  - Made the column `blNo` on table `Shipment` required. This step will fail if there are existing NULL values in that column.
  - Made the column `vessel` on table `Shipment` required. This step will fail if there are existing NULL values in that column.
  - Made the column `portOfLoading` on table `Shipment` required. This step will fail if there are existing NULL values in that column.
  - Made the column `portOfDischarge` on table `Shipment` required. This step will fail if there are existing NULL values in that column.
  - Made the column `eta` on table `Shipment` required. This step will fail if there are existing NULL values in that column.
  - Made the column `etd` on table `Shipment` required. This step will fail if there are existing NULL values in that column.
  - Added the required column `updatedAt` to the `ShipmentTask` table without a default value. This is not possible if the table is not empty.

*/
-- DropForeignKey
ALTER TABLE "Reminder" DROP CONSTRAINT "Reminder_shipmentId_fkey";

-- DropForeignKey
ALTER TABLE "ShipmentTask" DROP CONSTRAINT "ShipmentTask_shipmentId_fkey";

-- AlterTable
ALTER TABLE "Reminder" ADD COLUMN     "updatedAt" TIMESTAMP(3) NOT NULL;

-- AlterTable
ALTER TABLE "Shipment" ADD COLUMN     "nextAction" TEXT NOT NULL DEFAULT 'Check ETA & Port',
ALTER COLUMN "blNo" SET NOT NULL,
ALTER COLUMN "vessel" SET NOT NULL,
ALTER COLUMN "portOfLoading" SET NOT NULL,
ALTER COLUMN "portOfDischarge" SET NOT NULL,
ALTER COLUMN "eta" SET NOT NULL,
ALTER COLUMN "etd" SET NOT NULL,
ALTER COLUMN "currentStep" SET DEFAULT 'Shipment Received',
ALTER COLUMN "currentStep" SET DATA TYPE TEXT;

-- AlterTable
ALTER TABLE "ShipmentTask" ADD COLUMN     "updatedAt" TIMESTAMP(3) NOT NULL;

-- CreateIndex
CREATE INDEX "Reminder_shipmentId_idx" ON "Reminder"("shipmentId");

-- CreateIndex
CREATE INDEX "Reminder_completed_dueDate_idx" ON "Reminder"("completed", "dueDate");

-- CreateIndex
CREATE INDEX "Shipment_status_idx" ON "Shipment"("status");

-- CreateIndex
CREATE INDEX "Shipment_eta_idx" ON "Shipment"("eta");

-- CreateIndex
CREATE INDEX "Shipment_jobNo_idx" ON "Shipment"("jobNo");

-- CreateIndex
CREATE INDEX "ShipmentTask_shipmentId_idx" ON "ShipmentTask"("shipmentId");

-- CreateIndex
CREATE UNIQUE INDEX "ShipmentTask_shipmentId_stepOrder_key" ON "ShipmentTask"("shipmentId", "stepOrder");

-- AddForeignKey
ALTER TABLE "ShipmentTask" ADD CONSTRAINT "ShipmentTask_shipmentId_fkey" FOREIGN KEY ("shipmentId") REFERENCES "Shipment"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Reminder" ADD CONSTRAINT "Reminder_shipmentId_fkey" FOREIGN KEY ("shipmentId") REFERENCES "Shipment"("id") ON DELETE CASCADE ON UPDATE CASCADE;
