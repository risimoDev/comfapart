/*
  Warnings:

  - A unique constraint covering the columns `[telegramId]` on the table `User` will be added. If there are existing duplicate values, this will fail.

*/
-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "SecurityEventType" ADD VALUE 'TELEGRAM_VERIFIED';
ALTER TYPE "SecurityEventType" ADD VALUE 'TELEGRAM_UNLINKED';

-- AlterTable
ALTER TABLE "User" ADD COLUMN     "telegramId" BIGINT,
ADD COLUMN     "telegramUsername" TEXT,
ADD COLUMN     "telegramVerified" BOOLEAN NOT NULL DEFAULT false;

-- CreateTable
CREATE TABLE "TelegramVerification" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "used" BOOLEAN NOT NULL DEFAULT false,
    "usedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "TelegramVerification_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TelegramBotSettings" (
    "id" TEXT NOT NULL DEFAULT 'singleton',
    "botUsername" TEXT,
    "webhookUrl" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "totalUsers" INTEGER NOT NULL DEFAULT 0,
    "verifiedUsers" INTEGER NOT NULL DEFAULT 0,
    "messagesSent" INTEGER NOT NULL DEFAULT 0,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TelegramBotSettings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TelegramBotLog" (
    "id" TEXT NOT NULL,
    "telegramId" BIGINT NOT NULL,
    "messageType" TEXT NOT NULL,
    "direction" TEXT NOT NULL,
    "content" TEXT,
    "success" BOOLEAN NOT NULL DEFAULT true,
    "error" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "TelegramBotLog_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "TelegramVerification_code_key" ON "TelegramVerification"("code");

-- CreateIndex
CREATE INDEX "TelegramVerification_userId_idx" ON "TelegramVerification"("userId");

-- CreateIndex
CREATE INDEX "TelegramVerification_code_idx" ON "TelegramVerification"("code");

-- CreateIndex
CREATE INDEX "TelegramVerification_expiresAt_idx" ON "TelegramVerification"("expiresAt");

-- CreateIndex
CREATE INDEX "TelegramBotLog_telegramId_idx" ON "TelegramBotLog"("telegramId");

-- CreateIndex
CREATE INDEX "TelegramBotLog_messageType_idx" ON "TelegramBotLog"("messageType");

-- CreateIndex
CREATE INDEX "TelegramBotLog_createdAt_idx" ON "TelegramBotLog"("createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "User_telegramId_key" ON "User"("telegramId");

-- CreateIndex
CREATE INDEX "User_telegramId_idx" ON "User"("telegramId");

-- AddForeignKey
ALTER TABLE "TelegramVerification" ADD CONSTRAINT "TelegramVerification_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
