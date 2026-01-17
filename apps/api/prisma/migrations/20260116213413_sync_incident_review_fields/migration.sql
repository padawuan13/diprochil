-- Fix Railway schema: Incident.reviewedById is missing
ALTER TABLE `Incident`
  ADD COLUMN `reviewedById` INT NULL;

CREATE INDEX `Incident_reviewedById_idx` ON `Incident`(`reviewedById`);

ALTER TABLE `Incident`
  ADD CONSTRAINT `Incident_reviewedById_fkey`
  FOREIGN KEY (`reviewedById`) REFERENCES `User`(`id`)
  ON DELETE SET NULL ON UPDATE CASCADE;
