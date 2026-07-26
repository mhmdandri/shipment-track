-- AlterTable
ALTER TABLE "WaSubscription" ADD COLUMN     "phoneNumber" TEXT;

-- CreateIndex
CREATE INDEX "WaSubscription_phoneNumber_idx" ON "WaSubscription"("phoneNumber");
