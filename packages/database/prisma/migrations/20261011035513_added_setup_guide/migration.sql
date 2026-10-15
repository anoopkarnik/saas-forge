-- CreateTable
CREATE TABLE "scaffold_schema"."ProjectLaunchpad" (
    "projectId" TEXT NOT NULL,
    "state" JSONB NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ProjectLaunchpad_pkey" PRIMARY KEY ("projectId")
);

-- AddForeignKey
ALTER TABLE "scaffold_schema"."ProjectLaunchpad" ADD CONSTRAINT "ProjectLaunchpad_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "scaffold_schema"."ProjectConfig"("id") ON DELETE CASCADE ON UPDATE CASCADE;
