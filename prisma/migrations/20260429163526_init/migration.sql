-- CreateTable
CREATE TABLE "ImportBatch" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "fileName" TEXT,
    "contentHash" TEXT NOT NULL,
    "rawMarkdown" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable
CREATE TABLE "Task" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "ticketNumber" INTEGER NOT NULL,
    "title" TEXT NOT NULL,
    "userStory" TEXT NOT NULL DEFAULT '',
    "description" TEXT NOT NULL DEFAULT '',
    "acceptanceCriteria" TEXT NOT NULL DEFAULT '',
    "estimate" TEXT NOT NULL DEFAULT '',
    "priority" TEXT NOT NULL DEFAULT '',
    "importBatchId" TEXT NOT NULL,
    "basecampCardId" TEXT,
    "basecampColumnListId" TEXT,
    "syncStatus" TEXT NOT NULL DEFAULT 'pending',
    "lastSyncedAt" DATETIME,
    "lastSyncError" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Task_importBatchId_fkey" FOREIGN KEY ("importBatchId") REFERENCES "ImportBatch" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "BasecampConnection" (
    "id" TEXT NOT NULL PRIMARY KEY DEFAULT 'default',
    "accessTokenEnc" TEXT NOT NULL,
    "refreshTokenEnc" TEXT NOT NULL,
    "expiresAt" DATETIME NOT NULL,
    "accountId" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateIndex
CREATE INDEX "Task_syncStatus_idx" ON "Task"("syncStatus");

-- CreateIndex
CREATE UNIQUE INDEX "Task_importBatchId_ticketNumber_key" ON "Task"("importBatchId", "ticketNumber");
