-- DropIndex
DROP INDEX IF EXISTS "VesselMonitor_vesselName_port_key";

-- AlterTable
UPDATE "VesselMonitor" SET "voyageIn" = '' WHERE "voyageIn" IS NULL;
ALTER TABLE "VesselMonitor" ALTER COLUMN "voyageIn" SET NOT NULL;
ALTER TABLE "VesselMonitor" ALTER COLUMN "voyageIn" SET DEFAULT '';

-- CreateIndex
CREATE UNIQUE INDEX "VesselMonitor_vesselName_port_voyageIn_key" ON "VesselMonitor"("vesselName", "port", "voyageIn");
