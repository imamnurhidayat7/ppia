-- AlterTable
ALTER TABLE "Page" ADD COLUMN "excerpt" TEXT,
ADD COLUMN "metaTitle" TEXT,
ADD COLUMN "metaDescription" TEXT,
ADD COLUMN "featuredImage" TEXT,
ADD COLUMN "pageType" TEXT NOT NULL DEFAULT 'standard';

-- CreateIndex
CREATE INDEX "Page_published_idx" ON "Page"("published");

-- CreateIndex
CREATE INDEX "Page_pageType_idx" ON "Page"("pageType");

-- CreateTable
CREATE TABLE "PageBlock" (
    "id" TEXT NOT NULL,
    "pageId" TEXT NOT NULL,
    "type" "BlockType" NOT NULL,
    "title" TEXT,
    "titleId" TEXT,
    "subtitle" TEXT,
    "subtitleId" TEXT,
    "content" TEXT,
    "contentId" TEXT,
    "linkUrl" TEXT,
    "linkText" TEXT,
    "linkTextId" TEXT,
    "imageUrl" TEXT,
    "iconName" TEXT,
    "color" TEXT,
    "order" INTEGER NOT NULL DEFAULT 0,
    "config" JSONB,
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PageBlock_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "PageBlock_pageId_order_idx" ON "PageBlock"("pageId", "order");

-- AddForeignKey
ALTER TABLE "PageBlock" ADD CONSTRAINT "PageBlock_pageId_fkey" FOREIGN KEY ("pageId") REFERENCES "Page"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- ExtendBlockType enum with new values for page builder
ALTER TYPE "BlockType" ADD VALUE IF NOT EXISTS 'HERO';
ALTER TYPE "BlockType" ADD VALUE IF NOT EXISTS 'GALLERY';
ALTER TYPE "BlockType" ADD VALUE IF NOT EXISTS 'DIVIDER';
ALTER TYPE "BlockType" ADD VALUE IF NOT EXISTS 'SPACER';
ALTER TYPE "BlockType" ADD VALUE IF NOT EXISTS 'CODE';
ALTER TYPE "BlockType" ADD VALUE IF NOT EXISTS 'QUOTE';
ALTER TYPE "BlockType" ADD VALUE IF NOT EXISTS 'HEADING';
ALTER TYPE "BlockType" ADD VALUE IF NOT EXISTS 'COLUMNS';
