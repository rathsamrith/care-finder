-- CreateTable
CREATE TABLE `doctor_schedules` (
    `id` BIGINT NOT NULL AUTO_INCREMENT,
    `doctor_id` BIGINT NOT NULL,
    `weekday` TINYINT NOT NULL,
    `start_time` TIME NOT NULL,
    `end_time` TIME NOT NULL,

    UNIQUE INDEX `doctor_schedules_doctor_id_weekday_start_time_key`(`doctor_id`, `weekday`, `start_time`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `doctor_schedules` ADD CONSTRAINT `doctor_schedules_doctor_id_fkey` FOREIGN KEY (`doctor_id`) REFERENCES `doctors`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
