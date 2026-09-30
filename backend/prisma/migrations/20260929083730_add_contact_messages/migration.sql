-- CreateTable
CREATE TABLE `contact_messages` (
    `id` BIGINT NOT NULL AUTO_INCREMENT,
    `email` VARCHAR(191) NOT NULL,
    `message` TEXT NOT NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
