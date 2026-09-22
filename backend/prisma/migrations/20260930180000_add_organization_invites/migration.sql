-- CreateTable
CREATE TABLE `organization_invites` (
    `id` BIGINT NOT NULL AUTO_INCREMENT,
    `organization_id` BIGINT NOT NULL,
    `email` VARCHAR(191) NOT NULL,
    `role` ENUM('Owner', 'Admin', 'Manager') NOT NULL DEFAULT 'Manager',
    `token_hash` VARCHAR(191) NOT NULL,
    `invited_by_id` BIGINT NULL,
    `expires_at` DATETIME(3) NOT NULL,
    `accepted_at` DATETIME(3) NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    UNIQUE INDEX `organization_invites_token_hash_key`(`token_hash`),
    INDEX `organization_invites_organization_id_idx`(`organization_id`),
    INDEX `organization_invites_email_idx`(`email`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `organization_invites` ADD CONSTRAINT `organization_invites_organization_id_fkey` FOREIGN KEY (`organization_id`) REFERENCES `organizations`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `organization_invites` ADD CONSTRAINT `organization_invites_invited_by_id_fkey` FOREIGN KEY (`invited_by_id`) REFERENCES `users`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;
