-- CreateEnum
CREATE TYPE "BlockedDateSource" AS ENUM ('MANUAL', 'BOOKING', 'AVITO', 'BOOKING_COM', 'AIRBNB', 'OTHER');

-- CreateEnum
CREATE TYPE "CalendarSyncType" AS ENUM ('EXPORT', 'IMPORT');

-- CreateEnum
CREATE TYPE "CalendarSyncStatus" AS ENUM ('ACTIVE', 'PAUSED', 'ERROR');

-- AlterTable
ALTER TABLE "Apartment" ADD COLUMN     "ownerId" TEXT;

-- AlterTable
ALTER TABLE "BlockedDate" ADD COLUMN     "externalRef" TEXT,
ADD COLUMN     "source" "BlockedDateSource" NOT NULL DEFAULT 'MANUAL';

-- CreateTable
CREATE TABLE "CalendarSync" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "apartmentId" TEXT,
    "type" "CalendarSyncType" NOT NULL,
    "status" "CalendarSyncStatus" NOT NULL DEFAULT 'ACTIVE',
    "exportToken" TEXT,
    "importUrl" TEXT,
    "sourceName" TEXT,
    "syncInterval" INTEGER NOT NULL DEFAULT 30,
    "lastSyncAt" TIMESTAMP(3),
    "lastSyncError" TEXT,
    "eventsImported" INTEGER NOT NULL DEFAULT 0,
    "eventsExported" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CalendarSync_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ExternalCalendarEvent" (
    "id" TEXT NOT NULL,
    "calendarSyncId" TEXT NOT NULL,
    "apartmentId" TEXT NOT NULL,
    "externalUid" TEXT NOT NULL,
    "startDate" DATE NOT NULL,
    "endDate" DATE NOT NULL,
    "summary" TEXT,
    "description" TEXT,
    "sourceName" TEXT NOT NULL,
    "sourceUrl" TEXT,
    "rawData" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ExternalCalendarEvent_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "CalendarSync_exportToken_key" ON "CalendarSync"("exportToken");

-- CreateIndex
CREATE INDEX "CalendarSync_userId_idx" ON "CalendarSync"("userId");

-- CreateIndex
CREATE INDEX "CalendarSync_apartmentId_idx" ON "CalendarSync"("apartmentId");

-- CreateIndex
CREATE INDEX "CalendarSync_exportToken_idx" ON "CalendarSync"("exportToken");

-- CreateIndex
CREATE INDEX "CalendarSync_type_idx" ON "CalendarSync"("type");

-- CreateIndex
CREATE INDEX "CalendarSync_status_idx" ON "CalendarSync"("status");

-- CreateIndex
CREATE INDEX "ExternalCalendarEvent_apartmentId_idx" ON "ExternalCalendarEvent"("apartmentId");

-- CreateIndex
CREATE INDEX "ExternalCalendarEvent_startDate_endDate_idx" ON "ExternalCalendarEvent"("startDate", "endDate");

-- CreateIndex
CREATE UNIQUE INDEX "ExternalCalendarEvent_calendarSyncId_externalUid_key" ON "ExternalCalendarEvent"("calendarSyncId", "externalUid");

-- CreateIndex
CREATE INDEX "Apartment_ownerId_idx" ON "Apartment"("ownerId");

-- CreateIndex
CREATE INDEX "BlockedDate_source_idx" ON "BlockedDate"("source");

-- AddForeignKey
ALTER TABLE "Apartment" ADD CONSTRAINT "Apartment_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CalendarSync" ADD CONSTRAINT "CalendarSync_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CalendarSync" ADD CONSTRAINT "CalendarSync_apartmentId_fkey" FOREIGN KEY ("apartmentId") REFERENCES "Apartment"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ExternalCalendarEvent" ADD CONSTRAINT "ExternalCalendarEvent_calendarSyncId_fkey" FOREIGN KEY ("calendarSyncId") REFERENCES "CalendarSync"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ExternalCalendarEvent" ADD CONSTRAINT "ExternalCalendarEvent_apartmentId_fkey" FOREIGN KEY ("apartmentId") REFERENCES "Apartment"("id") ON DELETE CASCADE ON UPDATE CASCADE;
