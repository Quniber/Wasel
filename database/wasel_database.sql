-- ============================================================
-- WASEL - Taxi Platform Database Initialization Script
-- MySQL Database Schema and Seed Data
-- ============================================================
--
-- Usage:
-- 1. Create a MySQL database: CREATE DATABASE wasel;
-- 2. Run this script: mysql -u root -p wasel < wasel_database.sql
--
-- Or use with Prisma (recommended):
-- 1. Set DATABASE_URL in packages/database/.env
-- 2. Run: npm run db:push
-- 3. Run: npm run db:seed
-- ============================================================

-- Create database (uncomment if needed)
-- CREATE DATABASE IF NOT EXISTS wasel CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
-- USE wasel;

SET FOREIGN_KEY_CHECKS = 0;

-- ============================================================
-- DROP EXISTING TABLES (for clean install)
-- ============================================================

DROP TABLE IF EXISTS `feedback_parameters`;
DROP TABLE IF EXISTS `feedbacks`;
DROP TABLE IF EXISTS `rider_reviews`;
DROP TABLE IF EXISTS `sos_activities`;
DROP TABLE IF EXISTS `sos`;
DROP TABLE IF EXISTS `sos_reasons`;
DROP TABLE IF EXISTS `support_request_activities`;
DROP TABLE IF EXISTS `support_requests`;
DROP TABLE IF EXISTS `order_service_options`;
DROP TABLE IF EXISTS `order_notes`;
DROP TABLE IF EXISTS `order_activities`;
DROP TABLE IF EXISTS `order_messages`;
DROP TABLE IF EXISTS `fleet_transactions`;
DROP TABLE IF EXISTS `driver_transactions`;
DROP TABLE IF EXISTS `customer_transactions`;
DROP TABLE IF EXISTS `orders`;
DROP TABLE IF EXISTS `order_cancel_reasons`;
DROP TABLE IF EXISTS `coupon_services`;
DROP TABLE IF EXISTS `customer_coupons`;
DROP TABLE IF EXISTS `coupons`;
DROP TABLE IF EXISTS `saved_payment_methods`;
DROP TABLE IF EXISTS `payment_gateways`;
DROP TABLE IF EXISTS `service_regions`;
DROP TABLE IF EXISTS `zone_prices`;
DROP TABLE IF EXISTS `service_options`;
DROP TABLE IF EXISTS `driver_services`;
DROP TABLE IF EXISTS `services`;
DROP TABLE IF EXISTS `service_categories`;
DROP TABLE IF EXISTS `regions`;
DROP TABLE IF EXISTS `driver_documents`;
DROP TABLE IF EXISTS `document_types`;
DROP TABLE IF EXISTS `driver_notes`;
DROP TABLE IF EXISTS `driver_sessions`;
DROP TABLE IF EXISTS `blocked_drivers`;
DROP TABLE IF EXISTS `favorite_drivers`;
DROP TABLE IF EXISTS `drivers`;
DROP TABLE IF EXISTS `car_colors`;
DROP TABLE IF EXISTS `car_models`;
DROP TABLE IF EXISTS `customer_notes`;
DROP TABLE IF EXISTS `customer_sessions`;
DROP TABLE IF EXISTS `customer_addresses`;
DROP TABLE IF EXISTS `customers`;
DROP TABLE IF EXISTS `announcements`;
DROP TABLE IF EXISTS `app_versions`;
DROP TABLE IF EXISTS `settings`;
DROP TABLE IF EXISTS `review_parameters`;
DROP TABLE IF EXISTS `operators`;
DROP TABLE IF EXISTS `fleets`;
DROP TABLE IF EXISTS `media`;

-- ============================================================
-- MEDIA TABLE
-- ============================================================

CREATE TABLE `media` (
  `id` INT NOT NULL AUTO_INCREMENT,
  `fileName` VARCHAR(191) NOT NULL,
  `address` LONGTEXT NOT NULL,
  `mimeType` VARCHAR(191) NULL,
  `size` INT NULL,
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================
-- OPERATORS TABLE
-- ============================================================

CREATE TABLE `operators` (
  `id` INT NOT NULL AUTO_INCREMENT,
  `firstName` VARCHAR(191) NOT NULL,
  `lastName` VARCHAR(191) NOT NULL,
  `email` VARCHAR(191) NOT NULL,
  `password` VARCHAR(191) NOT NULL,
  `role` ENUM('admin', 'operator', 'viewer') NOT NULL DEFAULT 'operator',
  `isActive` BOOLEAN NOT NULL DEFAULT true,
  `notificationToken` VARCHAR(191) NULL,
  `lastLoginAt` DATETIME(3) NULL,
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updatedAt` DATETIME(3) NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `operators_email_key` (`email`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================
-- FLEET TABLES
-- ============================================================

CREATE TABLE `fleets` (
  `id` INT NOT NULL AUTO_INCREMENT,
  `name` VARCHAR(191) NOT NULL,
  `phoneNumber` VARCHAR(191) NOT NULL,
  `mobileNumber` VARCHAR(191) NOT NULL,
  `address` VARCHAR(191) NULL,
  `accountNumber` VARCHAR(191) NULL,
  `commissionSharePercent` INT NOT NULL DEFAULT 0,
  `commissionShareFlat` DECIMAL(10, 2) NOT NULL DEFAULT 0,
  `feeMultiplier` DECIMAL(10, 2) NULL,
  `userName` VARCHAR(191) NULL,
  `password` VARCHAR(191) NULL,
  `isBlocked` BOOLEAN NOT NULL DEFAULT false,
  `profilePictureId` INT NULL,
  `walletBalance` DECIMAL(10, 2) NOT NULL DEFAULT 0,
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updatedAt` DATETIME(3) NOT NULL,
  `deletedAt` DATETIME(3) NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `fleets_userName_key` (`userName`),
  KEY `fleets_profilePictureId_fkey` (`profilePictureId`),
  CONSTRAINT `fleets_profilePictureId_fkey` FOREIGN KEY (`profilePictureId`) REFERENCES `media` (`id`) ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================
-- CUSTOMER TABLES
-- ============================================================

CREATE TABLE `customers` (
  `id` INT NOT NULL AUTO_INCREMENT,
  `firstName` VARCHAR(191) NULL,
  `lastName` VARCHAR(191) NULL,
  `email` VARCHAR(191) NULL,
  `mobileNumber` VARCHAR(191) NOT NULL,
  `countryIso` VARCHAR(5) NULL,
  `gender` ENUM('male', 'female', 'other') NULL,
  `password` VARCHAR(191) NULL,
  `status` ENUM('enabled', 'disabled') NOT NULL DEFAULT 'enabled',
  `isResident` BOOLEAN NULL,
  `idNumber` VARCHAR(191) NULL,
  `notificationToken` VARCHAR(191) NULL,
  `mediaId` INT NULL,
  `presetAvatarNumber` INT NULL,
  `walletBalance` DECIMAL(10, 2) NOT NULL DEFAULT 0,
  `defaultPaymentMethodId` INT NULL,
  `lastActivityAt` DATETIME(3) NULL,
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updatedAt` DATETIME(3) NOT NULL,
  `deletedAt` DATETIME(3) NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `customers_email_key` (`email`),
  UNIQUE KEY `customers_mobileNumber_key` (`mobileNumber`),
  KEY `customers_mediaId_fkey` (`mediaId`),
  CONSTRAINT `customers_mediaId_fkey` FOREIGN KEY (`mediaId`) REFERENCES `media` (`id`) ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `customer_addresses` (
  `id` INT NOT NULL AUTO_INCREMENT,
  `customerId` INT NOT NULL,
  `type` ENUM('home', 'work', 'other') NOT NULL DEFAULT 'other',
  `title` VARCHAR(191) NULL,
  `address` VARCHAR(191) NOT NULL,
  `latitude` DECIMAL(10, 7) NOT NULL,
  `longitude` DECIMAL(10, 7) NOT NULL,
  `isDefault` BOOLEAN NOT NULL DEFAULT false,
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updatedAt` DATETIME(3) NOT NULL,
  PRIMARY KEY (`id`),
  KEY `customer_addresses_customerId_fkey` (`customerId`),
  CONSTRAINT `customer_addresses_customerId_fkey` FOREIGN KEY (`customerId`) REFERENCES `customers` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `customer_sessions` (
  `id` INT NOT NULL AUTO_INCREMENT,
  `customerId` INT NOT NULL,
  `deviceToken` VARCHAR(191) NULL,
  `devicePlatform` ENUM('ios', 'android', 'web') NULL,
  `deviceModel` VARCHAR(191) NULL,
  `appVersion` VARCHAR(191) NULL,
  `lastActiveAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  PRIMARY KEY (`id`),
  KEY `customer_sessions_customerId_fkey` (`customerId`),
  CONSTRAINT `customer_sessions_customerId_fkey` FOREIGN KEY (`customerId`) REFERENCES `customers` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `customer_notes` (
  `id` INT NOT NULL AUTO_INCREMENT,
  `customerId` INT NOT NULL,
  `operatorId` INT NOT NULL,
  `note` TEXT NOT NULL,
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  PRIMARY KEY (`id`),
  KEY `customer_notes_customerId_fkey` (`customerId`),
  KEY `customer_notes_operatorId_fkey` (`operatorId`),
  CONSTRAINT `customer_notes_customerId_fkey` FOREIGN KEY (`customerId`) REFERENCES `customers` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `customer_notes_operatorId_fkey` FOREIGN KEY (`operatorId`) REFERENCES `operators` (`id`) ON DELETE RESTRICT ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================
-- CAR MODELS AND COLORS
-- ============================================================

CREATE TABLE `car_models` (
  `id` INT NOT NULL AUTO_INCREMENT,
  `brand` VARCHAR(191) NOT NULL,
  `model` VARCHAR(191) NOT NULL,
  `year` INT NULL,
  `isActive` BOOLEAN NOT NULL DEFAULT true,
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `car_colors` (
  `id` INT NOT NULL AUTO_INCREMENT,
  `name` VARCHAR(191) NOT NULL,
  `hexCode` VARCHAR(7) NULL,
  `isActive` BOOLEAN NOT NULL DEFAULT true,
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================
-- DRIVER TABLES
-- ============================================================

CREATE TABLE `drivers` (
  `id` INT NOT NULL AUTO_INCREMENT,
  `firstName` VARCHAR(191) NULL,
  `lastName` VARCHAR(191) NULL,
  `email` VARCHAR(191) NULL,
  `mobileNumber` VARCHAR(191) NOT NULL,
  `countryIso` VARCHAR(5) NULL,
  `gender` ENUM('male', 'female', 'other') NULL,
  `password` VARCHAR(191) NULL,
  `status` ENUM('online', 'offline', 'in_ride', 'waiting_documents', 'pending_approval', 'soft_reject', 'hard_reject', 'blocked') NOT NULL DEFAULT 'waiting_documents',
  `certificateNumber` VARCHAR(191) NULL,
  `address` VARCHAR(191) NULL,
  `mediaId` INT NULL,
  `presetAvatarNumber` INT NULL,
  `carModelId` INT NULL,
  `carColorId` INT NULL,
  `carPlate` VARCHAR(191) NULL,
  `carProductionYear` INT NULL,
  `fleetId` INT NULL,
  `latitude` DECIMAL(10, 7) NULL,
  `longitude` DECIMAL(10, 7) NULL,
  `searchDistance` INT NULL DEFAULT 10000,
  `rating` DECIMAL(3, 2) NOT NULL DEFAULT 5.0,
  `reviewCount` INT NOT NULL DEFAULT 0,
  `acceptedOrdersCount` INT NOT NULL DEFAULT 0,
  `rejectedOrdersCount` INT NOT NULL DEFAULT 0,
  `completedOrdersCount` INT NOT NULL DEFAULT 0,
  `walletBalance` DECIMAL(10, 2) NOT NULL DEFAULT 0,
  `bankName` VARCHAR(191) NULL,
  `accountNumber` VARCHAR(191) NULL,
  `bankRoutingNumber` VARCHAR(191) NULL,
  `bankSwift` VARCHAR(191) NULL,
  `notificationToken` VARCHAR(191) NULL,
  `softRejectionNote` VARCHAR(191) NULL,
  `lastSeenAt` DATETIME(3) NULL,
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updatedAt` DATETIME(3) NOT NULL,
  `deletedAt` DATETIME(3) NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `drivers_email_key` (`email`),
  UNIQUE KEY `drivers_mobileNumber_key` (`mobileNumber`),
  KEY `drivers_mediaId_fkey` (`mediaId`),
  KEY `drivers_carModelId_fkey` (`carModelId`),
  KEY `drivers_carColorId_fkey` (`carColorId`),
  KEY `drivers_fleetId_fkey` (`fleetId`),
  CONSTRAINT `drivers_mediaId_fkey` FOREIGN KEY (`mediaId`) REFERENCES `media` (`id`) ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT `drivers_carModelId_fkey` FOREIGN KEY (`carModelId`) REFERENCES `car_models` (`id`) ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT `drivers_carColorId_fkey` FOREIGN KEY (`carColorId`) REFERENCES `car_colors` (`id`) ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT `drivers_fleetId_fkey` FOREIGN KEY (`fleetId`) REFERENCES `fleets` (`id`) ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `driver_sessions` (
  `id` INT NOT NULL AUTO_INCREMENT,
  `driverId` INT NOT NULL,
  `deviceToken` VARCHAR(191) NULL,
  `devicePlatform` ENUM('ios', 'android', 'web') NULL,
  `deviceModel` VARCHAR(191) NULL,
  `appVersion` VARCHAR(191) NULL,
  `lastActiveAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  PRIMARY KEY (`id`),
  KEY `driver_sessions_driverId_fkey` (`driverId`),
  CONSTRAINT `driver_sessions_driverId_fkey` FOREIGN KEY (`driverId`) REFERENCES `drivers` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `driver_notes` (
  `id` INT NOT NULL AUTO_INCREMENT,
  `driverId` INT NOT NULL,
  `operatorId` INT NOT NULL,
  `note` TEXT NOT NULL,
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  PRIMARY KEY (`id`),
  KEY `driver_notes_driverId_fkey` (`driverId`),
  KEY `driver_notes_operatorId_fkey` (`operatorId`),
  CONSTRAINT `driver_notes_driverId_fkey` FOREIGN KEY (`driverId`) REFERENCES `drivers` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `driver_notes_operatorId_fkey` FOREIGN KEY (`operatorId`) REFERENCES `operators` (`id`) ON DELETE RESTRICT ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `favorite_drivers` (
  `id` INT NOT NULL AUTO_INCREMENT,
  `customerId` INT NOT NULL,
  `driverId` INT NOT NULL,
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  PRIMARY KEY (`id`),
  UNIQUE KEY `favorite_drivers_customerId_driverId_key` (`customerId`, `driverId`),
  KEY `favorite_drivers_driverId_fkey` (`driverId`),
  CONSTRAINT `favorite_drivers_customerId_fkey` FOREIGN KEY (`customerId`) REFERENCES `customers` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `favorite_drivers_driverId_fkey` FOREIGN KEY (`driverId`) REFERENCES `drivers` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `blocked_drivers` (
  `id` INT NOT NULL AUTO_INCREMENT,
  `customerId` INT NOT NULL,
  `driverId` INT NOT NULL,
  `reason` VARCHAR(191) NULL,
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  PRIMARY KEY (`id`),
  UNIQUE KEY `blocked_drivers_customerId_driverId_key` (`customerId`, `driverId`),
  KEY `blocked_drivers_driverId_fkey` (`driverId`),
  CONSTRAINT `blocked_drivers_customerId_fkey` FOREIGN KEY (`customerId`) REFERENCES `customers` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `blocked_drivers_driverId_fkey` FOREIGN KEY (`driverId`) REFERENCES `drivers` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================
-- DOCUMENT TYPES AND DRIVER DOCUMENTS
-- ============================================================

CREATE TABLE `document_types` (
  `id` INT NOT NULL AUTO_INCREMENT,
  `name` VARCHAR(191) NOT NULL,
  `description` VARCHAR(191) NULL,
  `isRequired` BOOLEAN NOT NULL DEFAULT true,
  `hasExpiry` BOOLEAN NOT NULL DEFAULT false,
  `sortOrder` INT NOT NULL DEFAULT 0,
  `isActive` BOOLEAN NOT NULL DEFAULT true,
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `driver_documents` (
  `id` INT NOT NULL AUTO_INCREMENT,
  `driverId` INT NOT NULL,
  `documentTypeId` INT NOT NULL,
  `mediaId` INT NOT NULL,
  `status` ENUM('pending', 'approved', 'rejected') NOT NULL DEFAULT 'pending',
  `expiryDate` DATETIME(3) NULL,
  `rejectionNote` VARCHAR(191) NULL,
  `verifiedAt` DATETIME(3) NULL,
  `verifiedById` INT NULL,
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updatedAt` DATETIME(3) NOT NULL,
  PRIMARY KEY (`id`),
  KEY `driver_documents_driverId_fkey` (`driverId`),
  KEY `driver_documents_documentTypeId_fkey` (`documentTypeId`),
  KEY `driver_documents_mediaId_fkey` (`mediaId`),
  KEY `driver_documents_verifiedById_fkey` (`verifiedById`),
  CONSTRAINT `driver_documents_driverId_fkey` FOREIGN KEY (`driverId`) REFERENCES `drivers` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `driver_documents_documentTypeId_fkey` FOREIGN KEY (`documentTypeId`) REFERENCES `document_types` (`id`) ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT `driver_documents_mediaId_fkey` FOREIGN KEY (`mediaId`) REFERENCES `media` (`id`) ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT `driver_documents_verifiedById_fkey` FOREIGN KEY (`verifiedById`) REFERENCES `operators` (`id`) ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================
-- SERVICE TABLES
-- ============================================================

CREATE TABLE `service_categories` (
  `id` INT NOT NULL AUTO_INCREMENT,
  `name` VARCHAR(191) NOT NULL,
  `description` VARCHAR(191) NULL,
  `iconUrl` VARCHAR(191) NULL,
  `sortOrder` INT NOT NULL DEFAULT 0,
  `isActive` BOOLEAN NOT NULL DEFAULT true,
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `services` (
  `id` INT NOT NULL AUTO_INCREMENT,
  `categoryId` INT NULL,
  `name` VARCHAR(191) NOT NULL,
  `description` TEXT NULL,
  `mediaId` INT NULL,
  `personCapacity` INT NOT NULL DEFAULT 4,
  `baseFare` DECIMAL(10, 2) NOT NULL DEFAULT 0,
  `perKilometer` DECIMAL(10, 2) NOT NULL DEFAULT 0,
  `perHundredMeters` DECIMAL(10, 2) NOT NULL DEFAULT 0,
  `perMinuteDrive` DECIMAL(10, 2) NOT NULL DEFAULT 0,
  `perMinuteWait` DECIMAL(10, 2) NOT NULL DEFAULT 0,
  `minimumFare` DECIMAL(10, 2) NOT NULL DEFAULT 0,
  `cancellationFee` DECIMAL(10, 2) NOT NULL DEFAULT 0,
  `cancellationDriverShare` DECIMAL(10, 2) NOT NULL DEFAULT 0,
  `currency` CHAR(3) NOT NULL DEFAULT 'QAR',
  `providerSharePercent` INT NOT NULL DEFAULT 0,
  `providerShareFlat` DECIMAL(10, 2) NOT NULL DEFAULT 0,
  `searchRadius` INT NOT NULL DEFAULT 10000,
  `prepayPercent` INT NOT NULL DEFAULT 0,
  `twoWayAvailable` BOOLEAN NOT NULL DEFAULT false,
  `availableTimeFrom` VARCHAR(5) NOT NULL DEFAULT '00:00',
  `availableTimeTo` VARCHAR(5) NOT NULL DEFAULT '23:59',
  `displayPriority` INT NOT NULL DEFAULT 0,
  `isActive` BOOLEAN NOT NULL DEFAULT true,
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updatedAt` DATETIME(3) NOT NULL,
  `deletedAt` DATETIME(3) NULL,
  PRIMARY KEY (`id`),
  KEY `services_categoryId_fkey` (`categoryId`),
  KEY `services_mediaId_fkey` (`mediaId`),
  CONSTRAINT `services_categoryId_fkey` FOREIGN KEY (`categoryId`) REFERENCES `service_categories` (`id`) ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT `services_mediaId_fkey` FOREIGN KEY (`mediaId`) REFERENCES `media` (`id`) ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `service_options` (
  `id` INT NOT NULL AUTO_INCREMENT,
  `serviceId` INT NOT NULL,
  `name` VARCHAR(191) NOT NULL,
  `description` VARCHAR(191) NULL,
  `icon` VARCHAR(191) NULL,
  `price` DECIMAL(10, 2) NOT NULL DEFAULT 0,
  `isActive` BOOLEAN NOT NULL DEFAULT true,
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  PRIMARY KEY (`id`),
  KEY `service_options_serviceId_fkey` (`serviceId`),
  CONSTRAINT `service_options_serviceId_fkey` FOREIGN KEY (`serviceId`) REFERENCES `services` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `driver_services` (
  `id` INT NOT NULL AUTO_INCREMENT,
  `driverId` INT NOT NULL,
  `serviceId` INT NOT NULL,
  `isEnabled` BOOLEAN NOT NULL DEFAULT true,
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  PRIMARY KEY (`id`),
  UNIQUE KEY `driver_services_driverId_serviceId_key` (`driverId`, `serviceId`),
  KEY `driver_services_serviceId_fkey` (`serviceId`),
  CONSTRAINT `driver_services_driverId_fkey` FOREIGN KEY (`driverId`) REFERENCES `drivers` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `driver_services_serviceId_fkey` FOREIGN KEY (`serviceId`) REFERENCES `services` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `zone_prices` (
  `id` INT NOT NULL AUTO_INCREMENT,
  `serviceId` INT NOT NULL,
  `name` VARCHAR(191) NOT NULL,
  `fromPolygon` TEXT NOT NULL,
  `toPolygon` TEXT NOT NULL,
  `price` DECIMAL(10, 2) NOT NULL,
  `isActive` BOOLEAN NOT NULL DEFAULT true,
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  PRIMARY KEY (`id`),
  KEY `zone_prices_serviceId_fkey` (`serviceId`),
  CONSTRAINT `zone_prices_serviceId_fkey` FOREIGN KEY (`serviceId`) REFERENCES `services` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================
-- REGION TABLES
-- ============================================================

CREATE TABLE `regions` (
  `id` INT NOT NULL AUTO_INCREMENT,
  `name` VARCHAR(191) NOT NULL,
  `currency` CHAR(3) NOT NULL DEFAULT 'USD',
  `polygon` TEXT NOT NULL,
  `isEnabled` BOOLEAN NOT NULL DEFAULT true,
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updatedAt` DATETIME(3) NOT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `service_regions` (
  `id` INT NOT NULL AUTO_INCREMENT,
  `serviceId` INT NOT NULL,
  `regionId` INT NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `service_regions_serviceId_regionId_key` (`serviceId`, `regionId`),
  KEY `service_regions_regionId_fkey` (`regionId`),
  CONSTRAINT `service_regions_serviceId_fkey` FOREIGN KEY (`serviceId`) REFERENCES `services` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `service_regions_regionId_fkey` FOREIGN KEY (`regionId`) REFERENCES `regions` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================
-- PAYMENT TABLES
-- ============================================================

CREATE TABLE `payment_gateways` (
  `id` INT NOT NULL AUTO_INCREMENT,
  `type` ENUM('stripe', 'paypal', 'razorpay', 'paystack', 'flutterwave', 'cash') NOT NULL,
  `title` VARCHAR(191) NOT NULL,
  `description` VARCHAR(191) NULL,
  `publicKey` TEXT NULL,
  `privateKey` TEXT NOT NULL,
  `merchantId` VARCHAR(191) NULL,
  `saltKey` TEXT NULL,
  `mediaId` INT NULL,
  `isEnabled` BOOLEAN NOT NULL DEFAULT true,
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updatedAt` DATETIME(3) NOT NULL,
  `deletedAt` DATETIME(3) NULL,
  PRIMARY KEY (`id`),
  KEY `payment_gateways_mediaId_fkey` (`mediaId`),
  CONSTRAINT `payment_gateways_mediaId_fkey` FOREIGN KEY (`mediaId`) REFERENCES `media` (`id`) ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `saved_payment_methods` (
  `id` INT NOT NULL AUTO_INCREMENT,
  `customerId` INT NULL,
  `driverId` INT NULL,
  `paymentGatewayId` INT NOT NULL,
  `title` VARCHAR(191) NOT NULL,
  `lastFour` VARCHAR(4) NULL,
  `providerBrand` VARCHAR(191) NULL,
  `token` TEXT NOT NULL,
  `isDefault` BOOLEAN NOT NULL DEFAULT false,
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  PRIMARY KEY (`id`),
  KEY `saved_payment_methods_customerId_fkey` (`customerId`),
  KEY `saved_payment_methods_driverId_fkey` (`driverId`),
  KEY `saved_payment_methods_paymentGatewayId_fkey` (`paymentGatewayId`),
  CONSTRAINT `saved_payment_methods_customerId_fkey` FOREIGN KEY (`customerId`) REFERENCES `customers` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `saved_payment_methods_driverId_fkey` FOREIGN KEY (`driverId`) REFERENCES `drivers` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `saved_payment_methods_paymentGatewayId_fkey` FOREIGN KEY (`paymentGatewayId`) REFERENCES `payment_gateways` (`id`) ON DELETE RESTRICT ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Add foreign key for customers.defaultPaymentMethodId after saved_payment_methods exists
ALTER TABLE `customers` ADD CONSTRAINT `customers_defaultPaymentMethodId_fkey` FOREIGN KEY (`defaultPaymentMethodId`) REFERENCES `saved_payment_methods` (`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- ============================================================
-- COUPON TABLES
-- ============================================================

CREATE TABLE `coupons` (
  `id` INT NOT NULL AUTO_INCREMENT,
  `code` VARCHAR(191) NOT NULL,
  `title` VARCHAR(191) NOT NULL,
  `description` TEXT NULL,
  `manyUsersCanUse` INT NOT NULL DEFAULT 0,
  `manyTimesUserCanUse` INT NOT NULL DEFAULT 1,
  `minimumCost` DECIMAL(10, 2) NOT NULL DEFAULT 0,
  `maximumCost` DECIMAL(10, 2) NOT NULL DEFAULT 0,
  `startAt` DATETIME(3) NOT NULL,
  `expireAt` DATETIME(3) NULL,
  `discountPercent` INT NOT NULL DEFAULT 0,
  `discountFlat` DECIMAL(10, 2) NOT NULL DEFAULT 0,
  `creditGift` DECIMAL(10, 2) NOT NULL DEFAULT 0,
  `isEnabled` BOOLEAN NOT NULL DEFAULT true,
  `isFirstTravelOnly` BOOLEAN NOT NULL DEFAULT false,
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updatedAt` DATETIME(3) NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `coupons_code_key` (`code`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `customer_coupons` (
  `id` INT NOT NULL AUTO_INCREMENT,
  `customerId` INT NOT NULL,
  `couponId` INT NOT NULL,
  `usedCount` INT NOT NULL DEFAULT 0,
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  PRIMARY KEY (`id`),
  UNIQUE KEY `customer_coupons_customerId_couponId_key` (`customerId`, `couponId`),
  KEY `customer_coupons_couponId_fkey` (`couponId`),
  CONSTRAINT `customer_coupons_customerId_fkey` FOREIGN KEY (`customerId`) REFERENCES `customers` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `customer_coupons_couponId_fkey` FOREIGN KEY (`couponId`) REFERENCES `coupons` (`id`) ON DELETE RESTRICT ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `coupon_services` (
  `id` INT NOT NULL AUTO_INCREMENT,
  `couponId` INT NOT NULL,
  `serviceId` INT NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `coupon_services_couponId_serviceId_key` (`couponId`, `serviceId`),
  KEY `coupon_services_serviceId_fkey` (`serviceId`),
  CONSTRAINT `coupon_services_couponId_fkey` FOREIGN KEY (`couponId`) REFERENCES `coupons` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `coupon_services_serviceId_fkey` FOREIGN KEY (`serviceId`) REFERENCES `services` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================
-- ORDER TABLES
-- ============================================================

CREATE TABLE `order_cancel_reasons` (
  `id` INT NOT NULL AUTO_INCREMENT,
  `title` VARCHAR(191) NOT NULL,
  `isForDriver` BOOLEAN NOT NULL DEFAULT false,
  `isForRider` BOOLEAN NOT NULL DEFAULT true,
  `isActive` BOOLEAN NOT NULL DEFAULT true,
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `orders` (
  `id` INT NOT NULL AUTO_INCREMENT,
  `status` ENUM('Requested', 'NotFound', 'NoCloseFound', 'Found', 'DriverAccepted', 'Arrived', 'WaitingForPrePay', 'DriverCanceled', 'RiderCanceled', 'Started', 'WaitingForPostPay', 'WaitingForReview', 'Finished', 'Booked', 'Expired') NOT NULL DEFAULT 'Requested',
  `customerId` INT NOT NULL,
  `driverId` INT NULL,
  `serviceId` INT NOT NULL,
  `regionId` INT NULL,
  `fleetId` INT NULL,
  `couponId` INT NULL,
  `addresses` TEXT NOT NULL,
  `points` TEXT NOT NULL,
  `pickupAddress` VARCHAR(191) NULL,
  `pickupLatitude` DECIMAL(10, 7) NULL,
  `pickupLongitude` DECIMAL(10, 7) NULL,
  `dropoffAddress` VARCHAR(191) NULL,
  `dropoffLatitude` DECIMAL(10, 7) NULL,
  `dropoffLongitude` DECIMAL(10, 7) NULL,
  `distanceMeters` INT NOT NULL DEFAULT 0,
  `durationSeconds` INT NOT NULL DEFAULT 0,
  `waitMinutes` INT NOT NULL DEFAULT 0,
  `expectedTimestamp` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `pickupEta` DATETIME(3) NULL,
  `dropOffEta` DATETIME(3) NULL,
  `currency` CHAR(3) NOT NULL DEFAULT 'USD',
  `serviceCost` DECIMAL(10, 2) NOT NULL DEFAULT 0,
  `waitCost` DECIMAL(10, 2) NOT NULL DEFAULT 0,
  `optionsCost` DECIMAL(10, 2) NOT NULL DEFAULT 0,
  `taxCost` DECIMAL(10, 2) NOT NULL DEFAULT 0,
  `costBest` DECIMAL(10, 2) NOT NULL DEFAULT 0,
  `costAfterCoupon` DECIMAL(10, 2) NOT NULL DEFAULT 0,
  `tipAmount` DECIMAL(10, 2) NOT NULL DEFAULT 0,
  `paidAmount` DECIMAL(10, 2) NOT NULL DEFAULT 0,
  `providerShare` DECIMAL(10, 2) NOT NULL DEFAULT 0,
  `paymentMode` ENUM('cash', 'wallet', 'saved_payment_method', 'payment_gateway') NOT NULL DEFAULT 'cash',
  `paymentGatewayId` INT NULL,
  `savedPaymentMethodId` INT NULL,
  `cancelReasonId` INT NULL,
  `cancelReasonNote` TEXT NULL,
  `driverLastSeenMessagesAt` DATETIME(3) NULL,
  `riderLastSeenMessagesAt` DATETIME(3) NULL,
  `acceptedAt` DATETIME(3) NULL,
  `arrivedAt` DATETIME(3) NULL,
  `startedAt` DATETIME(3) NULL,
  `finishedAt` DATETIME(3) NULL,
  `canceledAt` DATETIME(3) NULL,
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updatedAt` DATETIME(3) NOT NULL,
  PRIMARY KEY (`id`),
  KEY `orders_status_idx` (`status`),
  KEY `orders_customerId_idx` (`customerId`),
  KEY `orders_driverId_idx` (`driverId`),
  KEY `orders_serviceId_fkey` (`serviceId`),
  KEY `orders_regionId_fkey` (`regionId`),
  KEY `orders_fleetId_fkey` (`fleetId`),
  KEY `orders_couponId_fkey` (`couponId`),
  KEY `orders_paymentGatewayId_fkey` (`paymentGatewayId`),
  KEY `orders_savedPaymentMethodId_fkey` (`savedPaymentMethodId`),
  KEY `orders_cancelReasonId_fkey` (`cancelReasonId`),
  CONSTRAINT `orders_customerId_fkey` FOREIGN KEY (`customerId`) REFERENCES `customers` (`id`) ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT `orders_driverId_fkey` FOREIGN KEY (`driverId`) REFERENCES `drivers` (`id`) ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT `orders_serviceId_fkey` FOREIGN KEY (`serviceId`) REFERENCES `services` (`id`) ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT `orders_regionId_fkey` FOREIGN KEY (`regionId`) REFERENCES `regions` (`id`) ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT `orders_fleetId_fkey` FOREIGN KEY (`fleetId`) REFERENCES `fleets` (`id`) ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT `orders_couponId_fkey` FOREIGN KEY (`couponId`) REFERENCES `coupons` (`id`) ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT `orders_paymentGatewayId_fkey` FOREIGN KEY (`paymentGatewayId`) REFERENCES `payment_gateways` (`id`) ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT `orders_savedPaymentMethodId_fkey` FOREIGN KEY (`savedPaymentMethodId`) REFERENCES `saved_payment_methods` (`id`) ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT `orders_cancelReasonId_fkey` FOREIGN KEY (`cancelReasonId`) REFERENCES `order_cancel_reasons` (`id`) ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `order_messages` (
  `id` INT NOT NULL AUTO_INCREMENT,
  `orderId` INT NOT NULL,
  `sentByDriver` BOOLEAN NOT NULL,
  `content` TEXT NOT NULL,
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  PRIMARY KEY (`id`),
  KEY `order_messages_orderId_idx` (`orderId`),
  CONSTRAINT `order_messages_orderId_fkey` FOREIGN KEY (`orderId`) REFERENCES `orders` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `order_activities` (
  `id` INT NOT NULL AUTO_INCREMENT,
  `orderId` INT NOT NULL,
  `status` ENUM('Requested', 'NotFound', 'NoCloseFound', 'Found', 'DriverAccepted', 'Arrived', 'WaitingForPrePay', 'DriverCanceled', 'RiderCanceled', 'Started', 'WaitingForPostPay', 'WaitingForReview', 'Finished', 'Booked', 'Expired') NOT NULL,
  `note` VARCHAR(191) NULL,
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  PRIMARY KEY (`id`),
  KEY `order_activities_orderId_idx` (`orderId`),
  CONSTRAINT `order_activities_orderId_fkey` FOREIGN KEY (`orderId`) REFERENCES `orders` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `order_notes` (
  `id` INT NOT NULL AUTO_INCREMENT,
  `orderId` INT NOT NULL,
  `operatorId` INT NOT NULL,
  `note` TEXT NOT NULL,
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  PRIMARY KEY (`id`),
  KEY `order_notes_orderId_fkey` (`orderId`),
  KEY `order_notes_operatorId_fkey` (`operatorId`),
  CONSTRAINT `order_notes_orderId_fkey` FOREIGN KEY (`orderId`) REFERENCES `orders` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `order_notes_operatorId_fkey` FOREIGN KEY (`operatorId`) REFERENCES `operators` (`id`) ON DELETE RESTRICT ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `order_service_options` (
  `id` INT NOT NULL AUTO_INCREMENT,
  `orderId` INT NOT NULL,
  `serviceOptionId` INT NOT NULL,
  `price` DECIMAL(10, 2) NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `order_service_options_orderId_serviceOptionId_key` (`orderId`, `serviceOptionId`),
  KEY `order_service_options_serviceOptionId_fkey` (`serviceOptionId`),
  CONSTRAINT `order_service_options_orderId_fkey` FOREIGN KEY (`orderId`) REFERENCES `orders` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `order_service_options_serviceOptionId_fkey` FOREIGN KEY (`serviceOptionId`) REFERENCES `service_options` (`id`) ON DELETE RESTRICT ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================
-- TRANSACTION TABLES
-- ============================================================

CREATE TABLE `customer_transactions` (
  `id` INT NOT NULL AUTO_INCREMENT,
  `customerId` INT NOT NULL,
  `orderId` INT NULL,
  `type` ENUM('credit', 'debit') NOT NULL,
  `action` ENUM('ride_payment', 'ride_earning', 'topup', 'withdrawal', 'refund', 'commission', 'tip', 'cancellation_fee', 'adjustment') NOT NULL,
  `amount` DECIMAL(10, 2) NOT NULL,
  `currency` CHAR(3) NOT NULL DEFAULT 'USD',
  `description` VARCHAR(191) NULL,
  `reference` VARCHAR(191) NULL,
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  PRIMARY KEY (`id`),
  KEY `customer_transactions_customerId_idx` (`customerId`),
  KEY `customer_transactions_orderId_fkey` (`orderId`),
  CONSTRAINT `customer_transactions_customerId_fkey` FOREIGN KEY (`customerId`) REFERENCES `customers` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `customer_transactions_orderId_fkey` FOREIGN KEY (`orderId`) REFERENCES `orders` (`id`) ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `driver_transactions` (
  `id` INT NOT NULL AUTO_INCREMENT,
  `driverId` INT NOT NULL,
  `orderId` INT NULL,
  `type` ENUM('credit', 'debit') NOT NULL,
  `action` ENUM('ride_payment', 'ride_earning', 'topup', 'withdrawal', 'refund', 'commission', 'tip', 'cancellation_fee', 'adjustment') NOT NULL,
  `amount` DECIMAL(10, 2) NOT NULL,
  `currency` CHAR(3) NOT NULL DEFAULT 'USD',
  `description` VARCHAR(191) NULL,
  `reference` VARCHAR(191) NULL,
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  PRIMARY KEY (`id`),
  KEY `driver_transactions_driverId_idx` (`driverId`),
  KEY `driver_transactions_orderId_fkey` (`orderId`),
  CONSTRAINT `driver_transactions_driverId_fkey` FOREIGN KEY (`driverId`) REFERENCES `drivers` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `driver_transactions_orderId_fkey` FOREIGN KEY (`orderId`) REFERENCES `orders` (`id`) ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `fleet_transactions` (
  `id` INT NOT NULL AUTO_INCREMENT,
  `fleetId` INT NOT NULL,
  `orderId` INT NULL,
  `type` ENUM('credit', 'debit') NOT NULL,
  `action` ENUM('ride_payment', 'ride_earning', 'topup', 'withdrawal', 'refund', 'commission', 'tip', 'cancellation_fee', 'adjustment') NOT NULL,
  `amount` DECIMAL(10, 2) NOT NULL,
  `currency` CHAR(3) NOT NULL DEFAULT 'USD',
  `description` VARCHAR(191) NULL,
  `reference` VARCHAR(191) NULL,
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  PRIMARY KEY (`id`),
  KEY `fleet_transactions_fleetId_idx` (`fleetId`),
  KEY `fleet_transactions_orderId_fkey` (`orderId`),
  CONSTRAINT `fleet_transactions_fleetId_fkey` FOREIGN KEY (`fleetId`) REFERENCES `fleets` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `fleet_transactions_orderId_fkey` FOREIGN KEY (`orderId`) REFERENCES `orders` (`id`) ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================
-- FEEDBACK & REVIEW TABLES
-- ============================================================

CREATE TABLE `review_parameters` (
  `id` INT NOT NULL AUTO_INCREMENT,
  `title` VARCHAR(191) NOT NULL,
  `isGood` BOOLEAN NOT NULL DEFAULT true,
  `isActive` BOOLEAN NOT NULL DEFAULT true,
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `feedbacks` (
  `id` INT NOT NULL AUTO_INCREMENT,
  `orderId` INT NOT NULL,
  `driverId` INT NOT NULL,
  `score` INT NOT NULL,
  `review` TEXT NULL,
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  PRIMARY KEY (`id`),
  UNIQUE KEY `feedbacks_orderId_key` (`orderId`),
  KEY `feedbacks_driverId_fkey` (`driverId`),
  CONSTRAINT `feedbacks_orderId_fkey` FOREIGN KEY (`orderId`) REFERENCES `orders` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `feedbacks_driverId_fkey` FOREIGN KEY (`driverId`) REFERENCES `drivers` (`id`) ON DELETE RESTRICT ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `feedback_parameters` (
  `id` INT NOT NULL AUTO_INCREMENT,
  `feedbackId` INT NOT NULL,
  `parameterId` INT NOT NULL,
  `isGood` BOOLEAN NOT NULL,
  PRIMARY KEY (`id`),
  KEY `feedback_parameters_feedbackId_fkey` (`feedbackId`),
  KEY `feedback_parameters_parameterId_fkey` (`parameterId`),
  CONSTRAINT `feedback_parameters_feedbackId_fkey` FOREIGN KEY (`feedbackId`) REFERENCES `feedbacks` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `feedback_parameters_parameterId_fkey` FOREIGN KEY (`parameterId`) REFERENCES `review_parameters` (`id`) ON DELETE RESTRICT ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `rider_reviews` (
  `id` INT NOT NULL AUTO_INCREMENT,
  `orderId` INT NOT NULL,
  `driverId` INT NOT NULL,
  `score` INT NOT NULL,
  `review` TEXT NULL,
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  PRIMARY KEY (`id`),
  UNIQUE KEY `rider_reviews_orderId_key` (`orderId`),
  KEY `rider_reviews_driverId_fkey` (`driverId`),
  CONSTRAINT `rider_reviews_orderId_fkey` FOREIGN KEY (`orderId`) REFERENCES `orders` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `rider_reviews_driverId_fkey` FOREIGN KEY (`driverId`) REFERENCES `drivers` (`id`) ON DELETE RESTRICT ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================
-- SUPPORT & SOS TABLES
-- ============================================================

CREATE TABLE `support_requests` (
  `id` INT NOT NULL AUTO_INCREMENT,
  `orderId` INT NULL,
  `customerId` INT NULL,
  `subject` VARCHAR(191) NOT NULL,
  `content` TEXT NOT NULL,
  `status` ENUM('submitted', 'in_progress', 'resolved') NOT NULL DEFAULT 'submitted',
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updatedAt` DATETIME(3) NOT NULL,
  PRIMARY KEY (`id`),
  KEY `support_requests_orderId_fkey` (`orderId`),
  KEY `support_requests_customerId_fkey` (`customerId`),
  CONSTRAINT `support_requests_orderId_fkey` FOREIGN KEY (`orderId`) REFERENCES `orders` (`id`) ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT `support_requests_customerId_fkey` FOREIGN KEY (`customerId`) REFERENCES `customers` (`id`) ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `support_request_activities` (
  `id` INT NOT NULL AUTO_INCREMENT,
  `supportRequestId` INT NOT NULL,
  `operatorId` INT NULL,
  `actorType` VARCHAR(20) NOT NULL,
  `content` TEXT NOT NULL,
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  PRIMARY KEY (`id`),
  KEY `support_request_activities_supportRequestId_fkey` (`supportRequestId`),
  KEY `support_request_activities_operatorId_fkey` (`operatorId`),
  CONSTRAINT `support_request_activities_supportRequestId_fkey` FOREIGN KEY (`supportRequestId`) REFERENCES `support_requests` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `support_request_activities_operatorId_fkey` FOREIGN KEY (`operatorId`) REFERENCES `operators` (`id`) ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `sos_reasons` (
  `id` INT NOT NULL AUTO_INCREMENT,
  `title` VARCHAR(191) NOT NULL,
  `isForDriver` BOOLEAN NOT NULL DEFAULT false,
  `isForRider` BOOLEAN NOT NULL DEFAULT true,
  `isActive` BOOLEAN NOT NULL DEFAULT true,
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `sos` (
  `id` INT NOT NULL AUTO_INCREMENT,
  `orderId` INT NOT NULL,
  `reasonId` INT NULL,
  `status` ENUM('submitted', 'in_progress', 'resolved') NOT NULL DEFAULT 'submitted',
  `submittedByRider` BOOLEAN NOT NULL,
  `comment` TEXT NULL,
  `latitude` DECIMAL(10, 7) NULL,
  `longitude` DECIMAL(10, 7) NULL,
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  PRIMARY KEY (`id`),
  KEY `sos_orderId_fkey` (`orderId`),
  KEY `sos_reasonId_fkey` (`reasonId`),
  CONSTRAINT `sos_orderId_fkey` FOREIGN KEY (`orderId`) REFERENCES `orders` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `sos_reasonId_fkey` FOREIGN KEY (`reasonId`) REFERENCES `sos_reasons` (`id`) ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `sos_activities` (
  `id` INT NOT NULL AUTO_INCREMENT,
  `sosId` INT NOT NULL,
  `operatorId` INT NULL,
  `action` VARCHAR(191) NOT NULL,
  `note` TEXT NULL,
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  PRIMARY KEY (`id`),
  KEY `sos_activities_sosId_fkey` (`sosId`),
  KEY `sos_activities_operatorId_fkey` (`operatorId`),
  CONSTRAINT `sos_activities_sosId_fkey` FOREIGN KEY (`sosId`) REFERENCES `sos` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `sos_activities_operatorId_fkey` FOREIGN KEY (`operatorId`) REFERENCES `operators` (`id`) ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================
-- SYSTEM TABLES
-- ============================================================

CREATE TABLE `settings` (
  `id` INT NOT NULL AUTO_INCREMENT,
  `key` VARCHAR(191) NOT NULL,
  `value` TEXT NOT NULL,
  `description` VARCHAR(191) NULL,
  `updatedAt` DATETIME(3) NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `settings_key_key` (`key`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `app_versions` (
  `id` INT NOT NULL AUTO_INCREMENT,
  `platform` ENUM('ios', 'android', 'web') NOT NULL,
  `appType` VARCHAR(20) NOT NULL,
  `versionCode` INT NOT NULL,
  `versionName` VARCHAR(191) NOT NULL,
  `releaseNotes` TEXT NULL,
  `forceUpdate` BOOLEAN NOT NULL DEFAULT false,
  `storeUrl` VARCHAR(191) NULL,
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `announcements` (
  `id` INT NOT NULL AUTO_INCREMENT,
  `title` VARCHAR(191) NOT NULL,
  `description` TEXT NOT NULL,
  `url` VARCHAR(191) NULL,
  `userType` ENUM('all', 'riders', 'drivers') NOT NULL DEFAULT 'all',
  `mediaId` INT NULL,
  `startAt` DATETIME(3) NOT NULL,
  `expireAt` DATETIME(3) NULL,
  `isActive` BOOLEAN NOT NULL DEFAULT true,
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updatedAt` DATETIME(3) NOT NULL,
  PRIMARY KEY (`id`),
  KEY `announcements_mediaId_fkey` (`mediaId`),
  CONSTRAINT `announcements_mediaId_fkey` FOREIGN KEY (`mediaId`) REFERENCES `media` (`id`) ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

SET FOREIGN_KEY_CHECKS = 1;

-- ============================================================
-- SEED DATA
-- ============================================================

-- Document Types
INSERT INTO `document_types` (`id`, `name`, `description`, `isRequired`, `hasExpiry`, `sortOrder`, `isActive`, `createdAt`) VALUES
(1, 'Driver''s License', 'Valid driver license', true, true, 1, true, NOW()),
(2, 'Vehicle Registration', 'Vehicle registration document', true, true, 2, true, NOW()),
(3, 'Insurance Certificate', 'Valid vehicle insurance', true, true, 3, true, NOW()),
(4, 'Profile Photo', 'Clear face photo', true, false, 4, true, NOW()),
(5, 'Vehicle Photo (Front)', 'Front view of vehicle', true, false, 5, true, NOW()),
(6, 'Vehicle Photo (Back)', 'Back view of vehicle', false, false, 6, true, NOW());

-- Car Models
INSERT INTO `car_models` (`id`, `brand`, `model`, `isActive`, `createdAt`) VALUES
(1, 'Toyota', 'Camry', true, NOW()),
(2, 'Toyota', 'Corolla', true, NOW()),
(3, 'Honda', 'Accord', true, NOW()),
(4, 'Honda', 'Civic', true, NOW()),
(5, 'Nissan', 'Altima', true, NOW()),
(6, 'Hyundai', 'Sonata', true, NOW()),
(7, 'Kia', 'Optima', true, NOW()),
(8, 'BMW', '3 Series', true, NOW()),
(9, 'Mercedes', 'C-Class', true, NOW()),
(10, 'Lexus', 'ES', true, NOW());

-- Car Colors
INSERT INTO `car_colors` (`id`, `name`, `hexCode`, `isActive`, `createdAt`) VALUES
(1, 'Black', '#000000', true, NOW()),
(2, 'White', '#FFFFFF', true, NOW()),
(3, 'Silver', '#C0C0C0', true, NOW()),
(4, 'Gray', '#808080', true, NOW()),
(5, 'Red', '#FF0000', true, NOW()),
(6, 'Blue', '#0000FF', true, NOW()),
(7, 'Green', '#008000', true, NOW()),
(8, 'Brown', '#8B4513', true, NOW()),
(9, 'Beige', '#F5F5DC', true, NOW()),
(10, 'Gold', '#FFD700', true, NOW());

-- Order Cancel Reasons
INSERT INTO `order_cancel_reasons` (`id`, `title`, `isForRider`, `isForDriver`, `isActive`, `createdAt`) VALUES
(1, 'Changed my mind', true, false, true, NOW()),
(2, 'Driver is taking too long', true, false, true, NOW()),
(3, 'Found another ride', true, false, true, NOW()),
(4, 'Emergency situation', true, false, true, NOW()),
(5, 'Wrong pickup location', true, false, true, NOW()),
(6, 'Other', true, false, true, NOW()),
(7, 'Customer not at pickup location', false, true, true, NOW()),
(8, 'Customer requested cancellation', false, true, true, NOW()),
(9, 'Vehicle issue', false, true, true, NOW()),
(10, 'Emergency', false, true, true, NOW()),
(11, 'Wrong address provided', false, true, true, NOW()),
(12, 'Other', false, true, true, NOW());

-- Service Category
INSERT INTO `service_categories` (`id`, `name`, `description`, `sortOrder`, `isActive`, `createdAt`) VALUES
(1, 'Taxi', 'Standard taxi services', 1, true, NOW());

-- Services
INSERT INTO `services` (`id`, `categoryId`, `name`, `description`, `personCapacity`, `baseFare`, `perHundredMeters`, `perMinuteDrive`, `perMinuteWait`, `minimumFare`, `cancellationFee`, `cancellationDriverShare`, `providerSharePercent`, `searchRadius`, `displayPriority`, `isActive`, `createdAt`, `updatedAt`) VALUES
(1, 1, 'Economy', 'Affordable rides for everyday trips', 4, 3.00, 0.15, 0.30, 0.20, 5.00, 3.00, 2.00, 20, 10000, 1, true, NOW(), NOW()),
(2, 1, 'Premium', 'Comfortable rides with premium vehicles', 4, 5.00, 0.25, 0.50, 0.30, 8.00, 5.00, 3.00, 20, 10000, 2, true, NOW(), NOW()),
(3, 1, 'XL', 'Spacious vehicles for larger groups', 6, 7.00, 0.30, 0.60, 0.40, 10.00, 5.00, 3.00, 20, 15000, 3, true, NOW(), NOW());

-- Settings
INSERT INTO `settings` (`id`, `key`, `value`, `description`, `updatedAt`) VALUES
(1, 'currency', 'USD', 'Default currency', NOW()),
(2, 'currency_symbol', '$', 'Currency symbol', NOW()),
(3, 'commission_percent', '20', 'Platform commission percentage', NOW()),
(4, 'driver_accept_timeout', '15', 'Seconds for driver to accept order', NOW()),
(5, 'free_cancellation_minutes', '2', 'Minutes for free cancellation', NOW()),
(6, 'default_cancellation_fee', '3', 'Default cancellation fee in currency', NOW()),
(7, 'timezone', 'America/New_York', 'Default timezone', NOW()),
(8, 'app_name', 'Taxi Platform', 'Application name', NOW()),
(9, 'support_email', 'support@taxi.com', 'Support email address', NOW()),
(10, 'support_phone', '+1-800-TAXI', 'Support phone number', NOW());

-- Review Parameters
INSERT INTO `review_parameters` (`id`, `title`, `isGood`, `isActive`, `createdAt`) VALUES
(1, 'Professional driver', true, true, NOW()),
(2, 'Clean vehicle', true, true, NOW()),
(3, 'Great route', true, true, NOW()),
(4, 'Smooth ride', true, true, NOW()),
(5, 'Unprofessional behavior', false, true, NOW()),
(6, 'Dirty vehicle', false, true, NOW()),
(7, 'Bad route', false, true, NOW()),
(8, 'Reckless driving', false, true, NOW());

-- Super Admin (password: Admin123!)
-- Password hash generated with bcrypt (10 rounds)
INSERT INTO `operators` (`id`, `firstName`, `lastName`, `email`, `password`, `role`, `isActive`, `createdAt`, `updatedAt`) VALUES
(1, 'Super', 'Admin', 'admin@taxi.com', '$2b$10$EpRnTzVlqHNP0.fUbXUwSOyuiXe/QLSUG6xNekdHgTGmrpHEfIoxm', 'admin', true, NOW(), NOW());

-- Payment Gateway (Cash)
INSERT INTO `payment_gateways` (`id`, `type`, `title`, `description`, `privateKey`, `isEnabled`, `createdAt`, `updatedAt`) VALUES
(1, 'cash', 'Cash Payment', 'Pay with cash to the driver', 'not_required', true, NOW(), NOW());

-- ============================================================
-- DONE
-- ============================================================

SELECT '============================================================' AS '';
SELECT 'WASEL DATABASE INITIALIZED SUCCESSFULLY!' AS 'Status';
SELECT '============================================================' AS '';
SELECT 'Summary:' AS '';
SELECT '  - Document Types: 6' AS '';
SELECT '  - Car Models: 10' AS '';
SELECT '  - Car Colors: 10' AS '';
SELECT '  - Cancel Reasons: 12' AS '';
SELECT '  - Services: 3 (Economy, Premium, XL)' AS '';
SELECT '  - Settings: 10' AS '';
SELECT '  - Review Parameters: 8' AS '';
SELECT '  - Super Admin: admin@taxi.com / Admin123!' AS '';
SELECT '  - Payment Gateway: Cash' AS '';
SELECT '============================================================' AS '';
