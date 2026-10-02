-- AlterTable
ALTER TABLE "user_schema"."Session" ADD COLUMN     "activeOrganizationId" TEXT;

-- CreateTable
CREATE TABLE "user_schema"."Organization" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "logo" TEXT,
    "metadata" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Organization_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "user_schema"."Member" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "role" TEXT NOT NULL DEFAULT 'member',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Member_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "user_schema"."OrganizationInvitation" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "role" TEXT,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "inviterId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "OrganizationInvitation_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Organization_slug_key" ON "user_schema"."Organization"("slug");

-- CreateIndex
CREATE INDEX "Member_userId_idx" ON "user_schema"."Member"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "Member_organizationId_userId_key" ON "user_schema"."Member"("organizationId", "userId");

-- CreateIndex
CREATE INDEX "OrganizationInvitation_organizationId_idx" ON "user_schema"."OrganizationInvitation"("organizationId");

-- CreateIndex
CREATE INDEX "OrganizationInvitation_email_idx" ON "user_schema"."OrganizationInvitation"("email");

-- AddForeignKey
ALTER TABLE "user_schema"."Member" ADD CONSTRAINT "Member_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "user_schema"."Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_schema"."Member" ADD CONSTRAINT "Member_userId_fkey" FOREIGN KEY ("userId") REFERENCES "user_schema"."User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_schema"."OrganizationInvitation" ADD CONSTRAINT "OrganizationInvitation_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "user_schema"."Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_schema"."OrganizationInvitation" ADD CONSTRAINT "OrganizationInvitation_inviterId_fkey" FOREIGN KEY ("inviterId") REFERENCES "user_schema"."User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

