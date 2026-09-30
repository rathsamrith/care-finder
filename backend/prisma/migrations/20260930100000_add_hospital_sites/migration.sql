-- AlterTable
ALTER TABLE `hospitals` ADD COLUMN `slug` VARCHAR(191) NULL,
    ADD COLUMN `logo` VARCHAR(191) NULL;

-- CreateIndex
CREATE UNIQUE INDEX `hospitals_slug_key` ON `hospitals`(`slug`);

-- CreateTable
CREATE TABLE `hospital_sites` (
    `id` BIGINT NOT NULL AUTO_INCREMENT,
    `hospital_id` BIGINT NOT NULL,
    `template` VARCHAR(191) NOT NULL DEFAULT 'classic',
    `theme` JSON NOT NULL,
    `sections` JSON NOT NULL,
    `hero_image` VARCHAR(191) NULL,
    `hero_title` VARCHAR(191) NULL,
    `hero_subtitle` VARCHAR(191) NULL,
    `seo_title` VARCHAR(191) NULL,
    `seo_description` VARCHAR(191) NULL,
    `published` BOOLEAN NOT NULL DEFAULT false,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    UNIQUE INDEX `hospital_sites_hospital_id_key`(`hospital_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `hospital_sites` ADD CONSTRAINT `hospital_sites_hospital_id_fkey` FOREIGN KEY (`hospital_id`) REFERENCES `hospitals`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
