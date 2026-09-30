-- AlterTable
ALTER TABLE `appointments` MODIFY `status` ENUM('Pending', 'Canceled', 'Missing', 'Confirmed', 'Rejected', 'Arrived', 'Completed') NOT NULL DEFAULT 'Pending',
    MODIFY `hospital_status` ENUM('Pending', 'Canceled', 'Missing', 'Confirmed', 'Rejected', 'Arrived', 'Completed') NOT NULL DEFAULT 'Pending',
    MODIFY `doctor_status` ENUM('Pending', 'Canceled', 'Missing', 'Confirmed', 'Rejected', 'Arrived', 'Completed') NOT NULL DEFAULT 'Pending',
    ADD COLUMN `checked_in_at` DATETIME(3) NULL,
    ADD COLUMN `check_in_method` VARCHAR(10) NULL,
    ADD COLUMN `queue_number` INTEGER NULL,
    ADD COLUMN `queue_prefix` VARCHAR(3) NULL,
    ADD COLUMN `completed_at` DATETIME(3) NULL;

-- AlterTable
ALTER TABLE `appointment_notifications` MODIFY `type` ENUM('Appointment Cancel', 'New Appointment Added', 'Appointment Accepted', 'Appointment Rejected', 'Patient Arrived') NOT NULL DEFAULT 'New Appointment Added';

-- CreateTable
CREATE TABLE `kiosks` (
    `id` BIGINT NOT NULL AUTO_INCREMENT,
    `hospital_id` BIGINT NOT NULL,
    `name` VARCHAR(191) NOT NULL,
    `prefix` VARCHAR(3) NOT NULL,
    `key_hash` VARCHAR(191) NOT NULL,
    `last_seen_at` DATETIME(3) NULL,
    `revoked_at` DATETIME(3) NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    UNIQUE INDEX `kiosks_key_hash_key`(`key_hash`),
    INDEX `kiosks_hospital_id_idx`(`hospital_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateIndex
CREATE UNIQUE INDEX `appointments_hospital_id_appointment_date_queue_number_key` ON `appointments`(`hospital_id`, `appointment_date`, `queue_number`);

-- AddForeignKey
ALTER TABLE `kiosks` ADD CONSTRAINT `kiosks_hospital_id_fkey` FOREIGN KEY (`hospital_id`) REFERENCES `hospitals`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
