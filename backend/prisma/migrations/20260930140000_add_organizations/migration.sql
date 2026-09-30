-- AlterTable
ALTER TABLE `hospitals` ADD COLUMN `organization_id` BIGINT NULL;

-- CreateTable
CREATE TABLE `organizations` (
    `id` BIGINT NOT NULL AUTO_INCREMENT,
    `name` VARCHAR(191) NOT NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `organization_members` (
    `id` BIGINT NOT NULL AUTO_INCREMENT,
    `organization_id` BIGINT NOT NULL,
    `user_id` BIGINT NOT NULL,
    `role` ENUM('Owner', 'Admin', 'Manager') NOT NULL DEFAULT 'Manager',
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `organization_members_user_id_idx`(`user_id`),
    UNIQUE INDEX `organization_members_organization_id_user_id_key`(`organization_id`, `user_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateIndex
CREATE INDEX `hospitals_organization_id_idx` ON `hospitals`(`organization_id`);

-- AddForeignKey
ALTER TABLE `hospitals` ADD CONSTRAINT `hospitals_organization_id_fkey` FOREIGN KEY (`organization_id`) REFERENCES `organizations`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `organization_members` ADD CONSTRAINT `organization_members_organization_id_fkey` FOREIGN KEY (`organization_id`) REFERENCES `organizations`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `organization_members` ADD CONSTRAINT `organization_members_user_id_fkey` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- Backfill: every existing hospital gets its own organization (same id, same
-- name) with its current owner as Owner, so behavior is unchanged.
INSERT INTO `organizations` (`id`, `name`, `created_at`, `updated_at`)
SELECT `id`, `name`, CURRENT_TIMESTAMP(3), CURRENT_TIMESTAMP(3) FROM `hospitals`;

UPDATE `hospitals` SET `organization_id` = `id`;

INSERT INTO `organization_members` (`organization_id`, `user_id`, `role`, `created_at`)
SELECT `id`, `user_id`, 'Owner', CURRENT_TIMESTAMP(3) FROM `hospitals`;
