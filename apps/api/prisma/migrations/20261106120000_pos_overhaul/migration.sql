-- AlterTable
ALTER TABLE `customer` ADD COLUMN `archivedAt` DATETIME(3) NULL,
    MODIFY `externalRef` VARCHAR(191) NULL;

-- AlterTable
ALTER TABLE `product` ADD COLUMN `archivedAt` DATETIME(3) NULL,
    MODIFY `sku` VARCHAR(191) NULL;

-- AlterTable
ALTER TABLE `sale` ADD COLUMN `code` VARCHAR(191) NULL,
    ADD COLUMN `status` VARCHAR(191) NOT NULL DEFAULT 'posted',
    ADD COLUMN `voidReason` VARCHAR(191) NULL,
    ADD COLUMN `voidedAt` DATETIME(3) NULL;

-- Backfill human-readable receipt codes for existing rows
UPDATE `sale`
SET `code` = CONCAT(
  'INV-',
  DATE_FORMAT(`occurredAt`, '%Y%m%d'),
  '-',
  UPPER(SUBSTRING(REPLACE(`id`, '-', ''), 1, 8))
)
WHERE `code` IS NULL;

ALTER TABLE `sale` MODIFY `code` VARCHAR(191) NOT NULL;

-- CreateIndex
CREATE INDEX `Customer_tenantId_phone_idx` ON `Customer`(`tenantId`, `phone`);

-- CreateIndex
CREATE INDEX `Product_tenantId_category_idx` ON `Product`(`tenantId`, `category`);

-- CreateIndex
CREATE INDEX `Sale_tenantId_customerId_idx` ON `Sale`(`tenantId`, `customerId`);

-- CreateIndex
CREATE INDEX `Sale_tenantId_status_idx` ON `Sale`(`tenantId`, `status`);

-- CreateIndex
CREATE UNIQUE INDEX `Sale_tenantId_code_key` ON `Sale`(`tenantId`, `code`);

-- CreateIndex
CREATE INDEX `SaleItem_productId_idx` ON `SaleItem`(`productId`);

-- AddForeignKey
ALTER TABLE `Sale` ADD CONSTRAINT `Sale_customerId_fkey` FOREIGN KEY (`customerId`) REFERENCES `Customer`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `SaleItem` ADD CONSTRAINT `SaleItem_productId_fkey` FOREIGN KEY (`productId`) REFERENCES `Product`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;
