-- CreateTable
CREATE TABLE "VesselMonitor" (
    "id" TEXT NOT NULL,
    "vesselName" TEXT NOT NULL,
    "port" TEXT NOT NULL DEFAULT 'npct1',
    "line" TEXT,
    "voyageIn" TEXT,
    "voyageOut" TEXT,
    "service" TEXT,
    "status" TEXT NOT NULL DEFAULT 'REGISTER',
    "etb" TIMESTAMP(3),
    "ata" TIMESTAMP(3),
    "etd" TIMESTAMP(3),
    "atd" TIMESTAMP(3),
    "openStacking" TIMESTAMP(3),
    "closingDoc" TIMESTAMP(3),
    "closingPhysic" TIMESTAMP(3),
    "waNumber" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "VesselMonitor_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "VesselMonitor_isActive_idx" ON "VesselMonitor"("isActive");

-- CreateIndex
CREATE INDEX "VesselMonitor_port_vesselName_idx" ON "VesselMonitor"("port", "vesselName");

-- CreateIndex
CREATE UNIQUE INDEX "VesselMonitor_vesselName_port_key" ON "VesselMonitor"("vesselName", "port");
