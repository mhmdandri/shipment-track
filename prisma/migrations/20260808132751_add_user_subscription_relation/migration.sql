-- AlterTable
ALTER TABLE "User" ADD COLUMN     "subscriptionId" TEXT;

-- CreateIndex
CREATE INDEX "User_subscriptionId_idx" ON "User"("subscriptionId");

-- AddForeignKey
ALTER TABLE "User" ADD CONSTRAINT "User_subscriptionId_fkey" FOREIGN KEY ("subscriptionId") REFERENCES "WaSubscription"("id") ON DELETE SET NULL ON UPDATE CASCADE;
