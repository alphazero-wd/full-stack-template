/*
  Warnings:

  - The primary key for the `File` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - The primary key for the `User` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - Added the required column `filename` to the `File` table without a default value. This is not possible if the table is not empty.
  - Added the required column `isLocal` to the `File` table without a default value. This is not possible if the table is not empty.
  - Added the required column `mimetype` to the `File` table without a default value. This is not possible if the table is not empty.
  - Added the required column `path` to the `File` table without a default value. This is not possible if the table is not empty.

*/
-- CreateEnum
CREATE TYPE "WebhookRequestStatus" AS ENUM ('Received', 'Forwarded', 'Replayed', 'Failed');

-- CreateEnum
CREATE TYPE "RequestMethod" AS ENUM ('GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'HEAD', 'CONNECT', 'OPTION', 'TRACE');

-- DropForeignKey
ALTER TABLE "User" DROP CONSTRAINT "User_avatarId_fkey";

-- AlterTable
ALTER TABLE "File" DROP CONSTRAINT "File_pkey",
ADD COLUMN     "filename" TEXT NOT NULL,
ADD COLUMN     "isLocal" BOOLEAN NOT NULL,
ADD COLUMN     "mimetype" TEXT NOT NULL,
ADD COLUMN     "path" TEXT NOT NULL,
ALTER COLUMN "id" DROP DEFAULT,
ALTER COLUMN "id" SET DATA TYPE TEXT,
ALTER COLUMN "url" DROP NOT NULL,
ALTER COLUMN "key" DROP NOT NULL,
ADD CONSTRAINT "File_pkey" PRIMARY KEY ("id");
DROP SEQUENCE "File_id_seq";

-- AlterTable
ALTER TABLE "User" DROP CONSTRAINT "User_pkey",
ALTER COLUMN "id" DROP DEFAULT,
ALTER COLUMN "id" SET DATA TYPE TEXT,
ALTER COLUMN "avatarId" SET DATA TYPE TEXT,
ADD CONSTRAINT "User_pkey" PRIMARY KEY ("id");
DROP SEQUENCE "User_id_seq";

-- CreateTable
CREATE TABLE "Project" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "ownerId" TEXT NOT NULL,

    CONSTRAINT "Project_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WebhookRequest" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "sourceUrl" VARCHAR(255) NOT NULL,
    "headers" JSONB NOT NULL,
    "method" "RequestMethod" NOT NULL,
    "queryParams" JSONB NOT NULL,
    "bodyRaw" BYTEA NOT NULL,
    "bodyParsed" JSONB,
    "contentType" VARCHAR(30) NOT NULL,
    "sourceIP" VARCHAR(100) NOT NULL,
    "userAgent" VARCHAR(255) NOT NULL,
    "receivedAt" TIMESTAMP(3) NOT NULL,
    "isVerified" BOOLEAN NOT NULL,
    "status" "WebhookRequestStatus" NOT NULL,
    "statusCode" SMALLINT,
    "body" TEXT,

    CONSTRAINT "WebhookRequest_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Replay" (
    "id" TEXT NOT NULL,
    "webhookRequestId" TEXT NOT NULL,
    "targetUrl" VARCHAR(200) NOT NULL,
    "headers" JSONB NOT NULL,
    "body" JSONB NOT NULL,
    "statusCode" SMALLINT NOT NULL,
    "responseBody" TEXT NOT NULL,
    "success" BOOLEAN NOT NULL,
    "attemptedAt" TIMESTAMP(3) NOT NULL,
    "latencyMs" INTEGER NOT NULL,

    CONSTRAINT "Replay_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DLQEntry" (
    "id" TEXT NOT NULL,
    "targetUrl" TEXT NOT NULL,
    "webhookRequestId" TEXT NOT NULL,
    "failureReason" VARCHAR(100) NOT NULL,
    "lastAttemptedAt" TIMESTAMP(3) NOT NULL,
    "attempts" INTEGER NOT NULL,
    "lastStatusCode" INTEGER NOT NULL,
    "lastResponseBody" TEXT,

    CONSTRAINT "DLQEntry_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Project_name_key" ON "Project"("name");

-- AddForeignKey
ALTER TABLE "User" ADD CONSTRAINT "User_avatarId_fkey" FOREIGN KEY ("avatarId") REFERENCES "File"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Project" ADD CONSTRAINT "Project_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WebhookRequest" ADD CONSTRAINT "WebhookRequest_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Replay" ADD CONSTRAINT "Replay_webhookRequestId_fkey" FOREIGN KEY ("webhookRequestId") REFERENCES "WebhookRequest"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DLQEntry" ADD CONSTRAINT "DLQEntry_webhookRequestId_fkey" FOREIGN KEY ("webhookRequestId") REFERENCES "WebhookRequest"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
