-- CreateTable
CREATE TABLE "scaffold_schema"."ReleaseEmailSubscription" (
    "userId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ReleaseEmailSubscription_pkey" PRIMARY KEY ("userId")
);

-- CreateTable
CREATE TABLE "scaffold_schema"."ReleaseEmail" (
    "userId" TEXT NOT NULL,
    "version" TEXT NOT NULL,
    "sentAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ReleaseEmail_pkey" PRIMARY KEY ("userId","version")
);

-- AddForeignKey
ALTER TABLE "scaffold_schema"."ReleaseEmailSubscription" ADD CONSTRAINT "ReleaseEmailSubscription_userId_fkey" FOREIGN KEY ("userId") REFERENCES "user_schema"."User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "scaffold_schema"."ReleaseEmail" ADD CONSTRAINT "ReleaseEmail_userId_fkey" FOREIGN KEY ("userId") REFERENCES "user_schema"."User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
