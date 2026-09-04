DROP INDEX `idx_inventory_product_printing`;--> statement-breakpoint
ALTER TABLE `inventory` ADD `owner_id` text DEFAULT 'e64a5304-84db-4dab-9c43-b14edc0b8a7d' NOT NULL;--> statement-breakpoint
CREATE UNIQUE INDEX `idx_inventory_owner_product_printing` ON `inventory` (`owner_id`,`product_id`,`printing`);--> statement-breakpoint
CREATE INDEX `idx_inventory_owner_id` ON `inventory` (`owner_id`);