import {
  index,
  integer,
  real,
  sqliteTable,
  text,
  uniqueIndex,
} from 'drizzle-orm/sqlite-core';

export const inventory = sqliteTable(
  'inventory',
  {
    id: integer('id').primaryKey({ autoIncrement: true }),
    ownerId: text('owner_id').notNull(),
    productId: integer('product_id'),
    name: text('name').notNull(),
    itemType: text('item_type').notNull().default('card'),
    printing: text('printing').notNull(),
    quantity: integer('quantity').notNull().default(1),
    marketPrice: real('market_price'),
    unitCost: real('unit_cost'),
    taxable: integer('taxable').notNull().default(0),
    taxRate: real('tax_rate').notNull().default(0),
    costSource: text('cost_source').notNull().default('purchase'),
    status: text('status').notNull().default('holding'),
    soldAt: text('sold_at'),
    soldPrice: real('sold_price'),
    saleNote: text('sale_note'),
    createdAt: text('created_at').notNull().default(''),
    updatedAt: text('updated_at'),
  },
  (table) => [
    uniqueIndex('idx_inventory_owner_product_printing').on(
      table.ownerId,
      table.productId,
      table.printing,
    ),
    index('idx_inventory_owner_id').on(table.ownerId),
    index('idx_inventory_owner_status').on(table.ownerId, table.status),
  ],
);
