-- CreateIndex
CREATE INDEX "TerminalMonitor_isActive_port_idx" ON "TerminalMonitor"("isActive", "port");

-- CreateIndex
CREATE INDEX "VesselMonitor_isActive_port_idx" ON "VesselMonitor"("isActive", "port");
