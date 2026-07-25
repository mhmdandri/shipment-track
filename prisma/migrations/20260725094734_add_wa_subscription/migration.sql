-- CreateTable
CREATE TABLE "WaSubscription" (
    "id" TEXT NOT NULL,
    "targetId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "plan" TEXT NOT NULL DEFAULT 'STARTER',
    "maxContainers" INTEGER NOT NULL DEFAULT 10,
    "expiredAt" TIMESTAMP(3) NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "WaSubscription_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "WaSubscription_targetId_key" ON "WaSubscription"("targetId");

-- CreateIndex
CREATE INDEX "WaSubscription_targetId_idx" ON "WaSubscription"("targetId");

-- CreateIndex
CREATE INDEX "WaSubscription_isActive_expiredAt_idx" ON "WaSubscription"("isActive", "expiredAt");
