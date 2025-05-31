/*
  Warnings:

  - Changed the type of `type` on the `notifications` table. No cast exists, the column would be dropped and recreated, which cannot be done if there is data, since the column is required.

*/
-- CreateEnum
CREATE TYPE "NotificationType" AS ENUM ('TICKET_CREATED', 'TICKET_ASSIGNED', 'TICKET_STATUS_UPDATED', 'TICKET_RESPONSE', 'SLA_WARNING', 'ASSIGNMENT', 'PATTERN_DETECTED', 'SYSTEM_NOTIFICATION');

-- DropForeignKey
ALTER TABLE "notifications" DROP CONSTRAINT "notifications_targetUserId_fkey";

-- AlterTable
ALTER TABLE "notifications" ADD COLUMN     "metadata" JSONB,
ADD COLUMN     "readAt" TIMESTAMP(3),
DROP COLUMN "type",
ADD COLUMN     "type" "NotificationType" NOT NULL;

-- CreateIndex
CREATE INDEX "notifications_targetUserId_read_idx" ON "notifications"("targetUserId", "read");

-- CreateIndex
CREATE INDEX "notifications_targetUserId_createdAt_idx" ON "notifications"("targetUserId", "createdAt");

-- CreateIndex
CREATE INDEX "notifications_ticketId_idx" ON "notifications"("ticketId");

-- CreateIndex
CREATE INDEX "notifications_type_idx" ON "notifications"("type");

-- AddForeignKey
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_targetUserId_fkey" FOREIGN KEY ("targetUserId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_ticketId_fkey" FOREIGN KEY ("ticketId") REFERENCES "tickets"("id") ON DELETE CASCADE ON UPDATE CASCADE;
