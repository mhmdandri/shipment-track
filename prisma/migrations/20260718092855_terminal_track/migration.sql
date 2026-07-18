-- CreateTable
CREATE TABLE "TerminalMonitor" (
    "id" TEXT NOT NULL,
    "containerNo" TEXT NOT NULL,
    "port" TEXT NOT NULL DEFAULT 'jict',
    "status" TEXT NOT NULL DEFAULT 'ONVSL',
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TerminalMonitor_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "TerminalMonitor_containerNo_key" ON "TerminalMonitor"("containerNo");

-- CreateIndex
CREATE INDEX "TerminalMonitor_isActive_idx" ON "TerminalMonitor"("isActive");
