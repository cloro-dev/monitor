/*
  Warnings:

  - The values [MICROSOFT_COPILOT,GOOGLE_AI_MODE,GOOGLE_AI_OVERVIEW] on the enum `ProviderModel` will be removed. If these variants are still used in the database, this will fail.

*/
-- AlterEnum
BEGIN;
CREATE TYPE "ProviderModel_new" AS ENUM ('CHATGPT', 'PERPLEXITY', 'COPILOT', 'AIMODE', 'AIOVERVIEW');

-- 1. Convert column to TEXT to allow arbitrary string manipulation
ALTER TABLE "result" ALTER COLUMN "model" TYPE TEXT USING "model"::text;

-- 2. Update the data in 'result' table
UPDATE "result" SET "model" = 'COPILOT' WHERE "model" = 'MICROSOFT_COPILOT';
UPDATE "result" SET "model" = 'AIMODE' WHERE "model" = 'GOOGLE_AI_MODE';
UPDATE "result" SET "model" = 'AIOVERVIEW' WHERE "model" = 'GOOGLE_AI_OVERVIEW';

-- 3. Update 'organization' JSONB column
-- We use text replacement to safely rename the values inside the JSON array
UPDATE "organization" 
SET "aiModels" = REPLACE(
  REPLACE(
    REPLACE("aiModels"::text, '"MICROSOFT_COPILOT"', '"COPILOT"'),
    '"GOOGLE_AI_MODE"', '"AIMODE"'
  ),
  '"GOOGLE_AI_OVERVIEW"', '"AIOVERVIEW"'
)::jsonb;

-- 4. Convert column to the NEW Enum type
ALTER TABLE "result" ALTER COLUMN "model" TYPE "ProviderModel_new" USING "model"::"ProviderModel_new";

-- 5. Swap the Enum types
ALTER TYPE "ProviderModel" RENAME TO "ProviderModel_old";
ALTER TYPE "ProviderModel_new" RENAME TO "ProviderModel";
DROP TYPE "public"."ProviderModel_old";

COMMIT;
