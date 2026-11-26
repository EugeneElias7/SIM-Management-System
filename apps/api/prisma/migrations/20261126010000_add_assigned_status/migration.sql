-- Add ASSIGNED to OperationalStatus enum
ALTER TYPE "OperationalStatus" ADD VALUE IF NOT EXISTS 'ASSIGNED';
