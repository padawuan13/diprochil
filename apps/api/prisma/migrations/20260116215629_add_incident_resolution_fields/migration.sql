-- Add missing Incident columns required by Prisma in Railway
ALTER TABLE `Incident`
  ADD COLUMN `comentarioResolucion` VARCHAR(191) NULL,
  ADD COLUMN `fechaRevision` DATETIME(3) NULL,
  ADD COLUMN `fechaCierre` DATETIME(3) NULL;

-- Optional indexes (safe)
CREATE INDEX `Incident_fechaRevision_idx` ON `Incident`(`fechaRevision`);
CREATE INDEX `Incident_fechaCierre_idx` ON `Incident`(`fechaCierre`);
