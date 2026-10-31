-- CreateTable
CREATE TABLE `User` (
    `id` VARCHAR(191) NOT NULL,
    `email` VARCHAR(191) NOT NULL,
    `passwordHash` VARCHAR(191) NOT NULL,
    `name` VARCHAR(191) NOT NULL,
    `tokenVersion` INTEGER NOT NULL DEFAULT 0,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    UNIQUE INDEX `User_email_key`(`email`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Tenant` (
    `id` VARCHAR(191) NOT NULL,
    `name` VARCHAR(191) NOT NULL,
    `currency` VARCHAR(191) NOT NULL DEFAULT 'IDR',
    `timezone` VARCHAR(191) NOT NULL DEFAULT 'Asia/Jakarta',
    `isDemo` BOOLEAN NOT NULL DEFAULT false,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `TenantMember` (
    `id` VARCHAR(191) NOT NULL,
    `userId` VARCHAR(191) NOT NULL,
    `tenantId` VARCHAR(191) NOT NULL,

    INDEX `TenantMember_tenantId_idx`(`tenantId`),
    UNIQUE INDEX `TenantMember_userId_tenantId_key`(`userId`, `tenantId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Customer` (
    `id` VARCHAR(191) NOT NULL,
    `tenantId` VARCHAR(191) NOT NULL,
    `externalRef` VARCHAR(191) NOT NULL,
    `name` VARCHAR(191) NOT NULL,
    `phone` VARCHAR(191) NULL,
    `email` VARCHAR(191) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `Customer_tenantId_idx`(`tenantId`),
    UNIQUE INDEX `Customer_tenantId_externalRef_key`(`tenantId`, `externalRef`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Product` (
    `id` VARCHAR(191) NOT NULL,
    `tenantId` VARCHAR(191) NOT NULL,
    `sku` VARCHAR(191) NOT NULL,
    `name` VARCHAR(191) NOT NULL,
    `category` VARCHAR(191) NULL,
    `price` DECIMAL(14, 2) NOT NULL,
    `cost` DECIMAL(14, 2) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `Product_tenantId_idx`(`tenantId`),
    UNIQUE INDEX `Product_tenantId_sku_key`(`tenantId`, `sku`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Sale` (
    `id` VARCHAR(191) NOT NULL,
    `tenantId` VARCHAR(191) NOT NULL,
    `customerId` VARCHAR(191) NULL,
    `occurredAt` DATETIME(3) NOT NULL,
    `notes` VARCHAR(191) NULL,
    `subtotal` DECIMAL(14, 2) NOT NULL,
    `discount` DECIMAL(14, 2) NOT NULL DEFAULT 0,
    `tax` DECIMAL(14, 2) NOT NULL DEFAULT 0,
    `total` DECIMAL(14, 2) NOT NULL,
    `source` VARCHAR(191) NOT NULL DEFAULT 'manual',
    `idempotencyKey` VARCHAR(191) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `Sale_tenantId_occurredAt_idx`(`tenantId`, `occurredAt`),
    UNIQUE INDEX `Sale_tenantId_idempotencyKey_key`(`tenantId`, `idempotencyKey`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `SaleItem` (
    `id` VARCHAR(191) NOT NULL,
    `saleId` VARCHAR(191) NOT NULL,
    `productId` VARCHAR(191) NULL,
    `description` VARCHAR(191) NOT NULL,
    `qty` INTEGER NOT NULL,
    `unitPrice` DECIMAL(14, 2) NOT NULL,
    `lineTotal` DECIMAL(14, 2) NOT NULL,

    INDEX `SaleItem_saleId_idx`(`saleId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `ChatConversation` (
    `id` VARCHAR(191) NOT NULL,
    `tenantId` VARCHAR(191) NOT NULL,
    `userId` VARCHAR(191) NOT NULL,
    `title` VARCHAR(191) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `ChatConversation_tenantId_createdAt_idx`(`tenantId`, `createdAt`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `ChatMessage` (
    `id` VARCHAR(191) NOT NULL,
    `conversationId` VARCHAR(191) NOT NULL,
    `role` VARCHAR(191) NOT NULL,
    `content` VARCHAR(191) NOT NULL,
    `toolName` VARCHAR(191) NULL,
    `toolResult` JSON NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `ChatMessage_conversationId_createdAt_idx`(`conversationId`, `createdAt`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `PendingAction` (
    `id` VARCHAR(191) NOT NULL,
    `tenantId` VARCHAR(191) NOT NULL,
    `conversationId` VARCHAR(191) NOT NULL,
    `tool` VARCHAR(191) NOT NULL,
    `payload` JSON NOT NULL,
    `preview` JSON NOT NULL,
    `status` VARCHAR(191) NOT NULL DEFAULT 'proposed',
    `expiresAt` DATETIME(3) NOT NULL,
    `executedAt` DATETIME(3) NULL,
    `result` JSON NULL,
    `idempotencyKey` VARCHAR(191) NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    UNIQUE INDEX `PendingAction_idempotencyKey_key`(`idempotencyKey`),
    INDEX `PendingAction_tenantId_status_idx`(`tenantId`, `status`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `AuditLog` (
    `id` VARCHAR(191) NOT NULL,
    `tenantId` VARCHAR(191) NOT NULL,
    `userId` VARCHAR(191) NOT NULL,
    `action` VARCHAR(191) NOT NULL,
    `entity` VARCHAR(191) NOT NULL,
    `entityId` VARCHAR(191) NOT NULL,
    `summary` JSON NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `AuditLog_tenantId_createdAt_idx`(`tenantId`, `createdAt`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `MlModel` (
    `id` VARCHAR(191) NOT NULL,
    `tenantId` VARCHAR(191) NULL,
    `modelName` VARCHAR(191) NOT NULL,
    `version` VARCHAR(191) NOT NULL,
    `status` VARCHAR(191) NOT NULL,
    `metrics` JSON NULL,
    `dataRange` VARCHAR(191) NULL,
    `trainedAt` DATETIME(3) NULL,
    `artifactPath` VARCHAR(191) NOT NULL,

    UNIQUE INDEX `MlModel_tenantId_modelName_version_key`(`tenantId`, `modelName`, `version`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `MlJob` (
    `id` VARCHAR(191) NOT NULL,
    `tenantId` VARCHAR(191) NULL,
    `modelName` VARCHAR(191) NOT NULL,
    `type` VARCHAR(191) NOT NULL,
    `status` VARCHAR(191) NOT NULL DEFAULT 'queued',
    `progress` INTEGER NOT NULL DEFAULT 0,
    `remoteJobId` VARCHAR(191) NULL,
    `error` VARCHAR(191) NULL,
    `result` JSON NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `MlJob_tenantId_status_idx`(`tenantId`, `status`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `TenantMember` ADD CONSTRAINT `TenantMember_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `User`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `TenantMember` ADD CONSTRAINT `TenantMember_tenantId_fkey` FOREIGN KEY (`tenantId`) REFERENCES `Tenant`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `SaleItem` ADD CONSTRAINT `SaleItem_saleId_fkey` FOREIGN KEY (`saleId`) REFERENCES `Sale`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `ChatMessage` ADD CONSTRAINT `ChatMessage_conversationId_fkey` FOREIGN KEY (`conversationId`) REFERENCES `ChatConversation`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
