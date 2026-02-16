ALTER TABLE "Project"
ADD COLUMN "links" JSONB NOT NULL DEFAULT '[]'::jsonb;

CREATE TABLE "Experience" (
  "id" TEXT NOT NULL,
  "company" TEXT NOT NULL,
  "role" TEXT NOT NULL,
  "employmentType" TEXT,
  "location" TEXT,
  "startMonth" TEXT NOT NULL,
  "endMonth" TEXT,
  "isCurrent" BOOLEAN NOT NULL DEFAULT false,
  "summaryHtml" TEXT NOT NULL DEFAULT '',
  "highlights" TEXT[] DEFAULT ARRAY[]::TEXT[],
  "techTags" TEXT[] DEFAULT ARRAY[]::TEXT[],
  "links" JSONB NOT NULL DEFAULT '[]'::jsonb,
  "sortOrder" INTEGER NOT NULL DEFAULT 0,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "Experience_pkey" PRIMARY KEY ("id")
);
