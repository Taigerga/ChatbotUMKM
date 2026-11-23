-- CreateTable
CREATE TABLE `CvScan` (
    `id` VARCHAR(191) NOT NULL,
    `tenantId` VARCHAR(191) NOT NULL,
    `createdBy` VARCHAR(191) NOT NULL,
    `fileName` VARCHAR(191) NOT NULL,
    `width` INTEGER NOT NULL,
    `height` INTEGER NOT NULL,
    `modelVersion` VARCHAR(191) NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `CvScan_tenantId_createdAt_idx`(`tenantId`, `createdAt`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `CvDetection` (
    `id` VARCHAR(191) NOT NULL,
    `scanId` VARCHAR(191) NOT NULL,
    `classId` INTEGER NOT NULL,
    `className` VARCHAR(191) NOT NULL,
    `confidence` DOUBLE NOT NULL,
    `xmin` DOUBLE NOT NULL,
    `ymin` DOUBLE NOT NULL,
    `xmax` DOUBLE NOT NULL,
    `ymax` DOUBLE NOT NULL,
    `mappedProductId` VARCHAR(191) NULL,

    INDEX `CvDetection_scanId_idx`(`scanId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `CvProductMapping` (
    `id` VARCHAR(191) NOT NULL,
    `tenantId` VARCHAR(191) NOT NULL,
    `classId` INTEGER NOT NULL,
    `className` VARCHAR(191) NOT NULL,
    `productId` VARCHAR(191) NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    UNIQUE INDEX `CvProductMapping_tenantId_classId_key`(`tenantId`, `classId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `CvDetection` ADD CONSTRAINT `CvDetection_scanId_fkey` FOREIGN KEY (`scanId`) REFERENCES `CvScan`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
