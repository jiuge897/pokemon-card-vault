ALTER TABLE `inventory` ADD `display_location` text DEFAULT 'vault' NOT NULL;
--> statement-breakpoint
ALTER TABLE `inventory` ADD `image_url` text;
--> statement-breakpoint
CREATE INDEX `idx_inventory_owner_display` ON `inventory` (`owner_id`,`display_location`);
