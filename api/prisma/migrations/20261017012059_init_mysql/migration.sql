-- AlterTable
ALTER TABLE `Article` MODIFY `title` TEXT NOT NULL,
    MODIFY `excerpt` TEXT NULL,
    MODIFY `imageUrl` TEXT NULL,
    MODIFY `metaTitle` TEXT NULL,
    MODIFY `metaDescription` TEXT NULL,
    MODIFY `metaKeywords` TEXT NULL;

-- AlterTable
ALTER TABLE `AuditLog` MODIFY `userAgent` TEXT NULL;

-- AlterTable
ALTER TABLE `Comment` MODIFY `content` TEXT NOT NULL;

-- AlterTable
ALTER TABLE `Division` MODIFY `description` TEXT NULL;

-- AlterTable
ALTER TABLE `Election` MODIFY `title` TEXT NOT NULL;

-- AlterTable
ALTER TABLE `ElectionFormField` MODIFY `label` TEXT NOT NULL;

-- AlterTable
ALTER TABLE `Event` MODIFY `title` TEXT NOT NULL,
    MODIFY `description` TEXT NOT NULL,
    MODIFY `imageUrl` TEXT NULL,
    MODIFY `location` TEXT NULL,
    MODIFY `locationMapUrl` TEXT NULL;

-- AlterTable
ALTER TABLE `EventDocumentation` MODIFY `url` TEXT NOT NULL,
    MODIFY `title` TEXT NULL,
    MODIFY `description` TEXT NULL;

-- AlterTable
ALTER TABLE `Faq` MODIFY `question` TEXT NOT NULL,
    MODIFY `answer` TEXT NOT NULL;

-- AlterTable
ALTER TABLE `LandingSection` MODIFY `title` TEXT NULL,
    MODIFY `titleId` TEXT NULL,
    MODIFY `subtitle` TEXT NULL,
    MODIFY `subtitleId` TEXT NULL,
    MODIFY `description` TEXT NULL,
    MODIFY `descriptionId` TEXT NULL;

-- AlterTable
ALTER TABLE `Media` MODIFY `url` TEXT NOT NULL;

-- AlterTable
ALTER TABLE `Notification` MODIFY `title` TEXT NOT NULL,
    MODIFY `body` TEXT NULL;

-- AlterTable
ALTER TABLE `Page` MODIFY `title` TEXT NOT NULL,
    MODIFY `excerpt` TEXT NULL,
    MODIFY `metaTitle` TEXT NULL,
    MODIFY `metaDescription` TEXT NULL,
    MODIFY `featuredImage` TEXT NULL;

-- AlterTable
ALTER TABLE `PageBlock` MODIFY `title` TEXT NULL,
    MODIFY `titleId` TEXT NULL,
    MODIFY `subtitle` TEXT NULL,
    MODIFY `subtitleId` TEXT NULL,
    MODIFY `content` TEXT NULL,
    MODIFY `contentId` TEXT NULL,
    MODIFY `linkUrl` TEXT NULL,
    MODIFY `linkText` TEXT NULL,
    MODIFY `linkTextId` TEXT NULL,
    MODIFY `imageUrl` TEXT NULL;

-- AlterTable
ALTER TABLE `Research` MODIFY `title` TEXT NOT NULL,
    MODIFY `titleIndonesian` TEXT NULL,
    MODIFY `abstract` TEXT NOT NULL,
    MODIFY `abstractIndonesian` TEXT NULL,
    MODIFY `authors` TEXT NOT NULL,
    MODIFY `url` TEXT NULL,
    MODIFY `keywords` TEXT NULL,
    MODIFY `citationText` TEXT NULL,
    MODIFY `generatedCitation` TEXT NULL,
    MODIFY `pdfUrl` TEXT NULL,
    MODIFY `imageUrl` TEXT NULL,
    MODIFY `metaTitle` TEXT NULL,
    MODIFY `metaDescription` TEXT NULL,
    MODIFY `metaKeywords` TEXT NULL,
    MODIFY `reviewComments` TEXT NULL;

-- AlterTable
ALTER TABLE `SectionBlock` MODIFY `title` TEXT NULL,
    MODIFY `titleId` TEXT NULL,
    MODIFY `subtitle` TEXT NULL,
    MODIFY `subtitleId` TEXT NULL,
    MODIFY `content` TEXT NULL,
    MODIFY `contentId` TEXT NULL,
    MODIFY `linkUrl` TEXT NULL,
    MODIFY `linkText` TEXT NULL,
    MODIFY `linkTextId` TEXT NULL,
    MODIFY `imageUrl` TEXT NULL;

-- AlterTable
ALTER TABLE `Setting` MODIFY `value` TEXT NOT NULL;

-- AlterTable
ALTER TABLE `Tag` MODIFY `description` TEXT NULL;

-- AlterTable
ALTER TABLE `User` MODIFY `avatar` TEXT NULL,
    MODIFY `bio` TEXT NULL,
    MODIFY `memberCardUrl` TEXT NULL,
    MODIFY `rejectionReason` TEXT NULL;
