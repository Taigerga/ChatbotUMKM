-- DropIndex
DROP INDEX `ChatConversation_tenantId_createdAt_idx` ON `chatconversation`;

-- AlterTable
ALTER TABLE `chatconversation` ADD COLUMN `pinned` BOOLEAN NOT NULL DEFAULT false;

-- CreateTable
CREATE TABLE `UserAiConfig` (
    `id` VARCHAR(191) NOT NULL,
    `userId` VARCHAR(191) NOT NULL,
    `provider` VARCHAR(191) NOT NULL,
    `model` VARCHAR(191) NOT NULL,
    `baseUrl` VARCHAR(191) NULL,
    `apiKeyEncrypted` LONGTEXT NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    UNIQUE INDEX `UserAiConfig_userId_key`(`userId`),
    INDEX `UserAiConfig_userId_idx`(`userId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateIndex
CREATE INDEX `ChatConversation_tenantId_userId_pinned_updatedAt_idx` ON `ChatConversation`(`tenantId`, `userId`, `pinned`, `updatedAt`);

-- AddForeignKey
ALTER TABLE `UserAiConfig` ADD CONSTRAINT `UserAiConfig_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `User`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
