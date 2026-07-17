-- CreateEnum
CREATE TYPE "ShipmentType" AS ENUM ('IMPORT', 'EXPORT');

-- AlterTable
ALTER TABLE "Shipment" ADD COLUMN     "type" "ShipmentType" NOT NULL DEFAULT 'IMPORT';
