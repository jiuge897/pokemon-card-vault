import { env } from 'cloudflare:workers';
export type InventoryRow = {
  id: number;
  productId: number | null;
  sourceId: string | null;
  sourceUrl: string | null;
  name: string;
  itemType: 'card' | 'sealed' | 'merch';
  printing: string;
  quantity: number;
  marketPrice: number | null;
  unitCost: number | null;
  taxable: number;
  taxRate: number;
  costSource: 'purchase' | 'pulled';
  createdAt: string;
  updatedAt: string | null;
};
export async function listInventory(ownerId: string): Promise<InventoryRow[]> {
  const r = await env.DB.prepare(
    `SELECT id,product_id AS productId,source_id AS sourceId,source_url AS sourceUrl,name,item_type AS itemType,printing,quantity,market_price AS marketPrice,unit_cost AS unitCost,taxable,tax_rate AS taxRate,cost_source AS costSource,COALESCE(NULLIF(created_at,''),updated_at,'') AS createdAt,updated_at AS updatedAt FROM inventory WHERE owner_id=? ORDER BY id DESC`,
  )
    .bind(ownerId)
    .all<InventoryRow>();
  return r.results;
}

const cashRateFor = (itemType: InventoryRow['itemType']) =>
  itemType === 'sealed' ? 0.8 : itemType === 'card' ? 0.5 : 1;

export async function recordDailyRoiSnapshots(
  ownerId: string,
  inventory?: InventoryRow[],
) {
  const items = inventory ?? (await listInventory(ownerId));
  const date = new Date().toISOString().slice(0, 10);
  for (const item of items) {
    if (
      item.itemType === 'merch' ||
      item.unitCost == null ||
      item.marketPrice == null
    )
      continue;
    await env.DB.prepare(
      `INSERT INTO roi_history(owner_id,inventory_id,snapshot_date,quantity,market_price,unit_cost,taxable,tax_rate,cash_rate) VALUES(?,?,?,?,?,?,?,?,?) ON CONFLICT(owner_id,inventory_id,snapshot_date) DO UPDATE SET quantity=excluded.quantity,market_price=excluded.market_price,unit_cost=excluded.unit_cost,taxable=excluded.taxable,tax_rate=excluded.tax_rate,cash_rate=excluded.cash_rate`,
    )
      .bind(
        ownerId,
        item.id,
        date,
        item.quantity,
        item.marketPrice,
        item.unitCost,
        item.taxable,
        item.taxRate,
        cashRateFor(item.itemType),
      )
      .run();
  }
}
