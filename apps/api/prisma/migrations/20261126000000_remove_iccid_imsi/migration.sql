-- DropUniqueIndex
DROP INDEX IF EXISTS "sims_iccid_key";
DROP INDEX IF EXISTS "sims_imsi_key";

-- AlterTable
ALTER TABLE "sims" DROP COLUMN IF EXISTS "iccid",
DROP COLUMN IF EXISTS "imsi";
