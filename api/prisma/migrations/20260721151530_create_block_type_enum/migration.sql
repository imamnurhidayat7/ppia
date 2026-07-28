-- Creates the "BlockType" enum that the next migration depends on.
--
-- WHY THIS EXISTS
-- 20260721151531_add_page_blocks_and_seo declares `"type" "BlockType" NOT NULL`
-- and runs `ALTER TYPE "BlockType" ADD VALUE …`, but no migration ever created
-- the type. The live database has it because it was introduced out of band (a
-- `prisma db push`), so migrations kept working there while a replay from an
-- empty database failed with:
--
--   P3006 … ERROR: type "BlockType" does not exist
--
-- That replay is exactly what `prisma migrate dev` does against its shadow
-- database, so the whole command was unusable and every new migration had to be
-- hand-written and applied with `migrate deploy`.
--
-- WHY A SEPARATE MIGRATION, ONE SECOND EARLIER
-- Editing 20260721151531 would have been the obvious fix, but Prisma stores a
-- checksum of every applied migration and refuses to continue when an applied
-- file changes. Migrations replay in folder-name order, so a new folder named
-- one second earlier runs first during a shadow replay while leaving the
-- already-applied file untouched.
--
-- WHY IT IS IDEMPOTENT
-- On the existing database this migration is pending and will be applied by
-- `migrate deploy`, where the type already exists. Postgres has no
-- `CREATE TYPE IF NOT EXISTS`, hence the DO block: on a database that already
-- has the type this is a no-op, and on an empty one it creates it.
--
-- The value list is the full current set, matching schema.prisma and the live
-- database. Listing only the original values would leave a shadow replay short
-- of the ones added later out of band, which Prisma would then report as drift.
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'BlockType') THEN
    CREATE TYPE "BlockType" AS ENUM (
      'TEXT',
      'IMAGE',
      'VIDEO',
      'CTA_BUTTON',
      'STATISTIC',
      'FEATURE',
      'ARTICLE_CARD',
      'EVENT_CARD',
      'MEMBER_CARD',
      'SOCIAL_LINK',
      'NEWSLETTER_FORM',
      'HERO',
      'GALLERY',
      'DIVIDER',
      'SPACER',
      'CODE',
      'QUOTE',
      'HEADING',
      'COLUMNS',
      'TIMELINE',
      'TEAM',
      'TABLE',
      'CONTACT',
      'COUNTDOWN',
      'SPONSOR',
      'FAQ',
      'MAP'
    );
  END IF;
END
$$;
