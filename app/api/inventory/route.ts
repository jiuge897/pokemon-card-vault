import { env } from 'cloudflare:workers';
import { getChatGPTUser } from '@/app/chatgpt-auth';
import { listInventory, recordDailyRoiSnapshots } from '@/lib/inventory-db';
async function currentUser() {
  const user = await getChatGPTUser();
  if (!user)
    throw new Response(JSON.stringify({ errorCode: 'AUTH_REQUIRED' }), {
      status: 401,
      headers: { 'content-type': 'application/json' },
    });
  return user;
}
const textValue = (value: unknown, fallback = '') =>
  typeof value === 'string' ? value : fallback;
export async function GET() {
  try {
    const user = await currentUser();
    return Response.json({ items: await listInventory(user.id) });
  } catch (error) {
    if (error instanceof Response) return error;
    throw error;
  }
}
export async function POST(request: Request) {
  try {
    const user = await currentUser();
    const b = (await request.json()) as Record<string, unknown>;
    const quantity = Math.max(1, Math.floor(Number(b.quantity) || 1)),
      name = textValue(b.name).trim().slice(0, 120),
      now = new Date().toISOString(),
      itemType =
        b.itemType === 'merch'
          ? 'merch'
          : b.itemType === 'sealed'
            ? 'sealed'
            : 'card';
    if (itemType === 'merch') {
      const sourceId = textValue(b.sourceId).trim().toUpperCase().slice(0, 40),
        sourceUrl = textValue(b.sourceUrl).trim().slice(0, 500),
        officialPrice = Number(b.officialPrice);
      if (
        !/^[A-Z0-9-]{3,40}$/.test(sourceId) ||
        !name ||
        !Number.isFinite(officialPrice) ||
        officialPrice <= 0 ||
        officialPrice > 100000
      )
        return Response.json({ errorCode: 'INCOMPLETE' }, { status: 400 });
      let safeUrl = `https://www.pokemoncenter.com/product/${encodeURIComponent(sourceId)}`;
      if (sourceUrl) {
        try {
          const url = new URL(sourceUrl);
          if (
            url.hostname === 'pokemoncenter.com' ||
            url.hostname.endsWith('.pokemoncenter.com')
          )
            safeUrl = url.toString();
        } catch {}
      }
      await env.DB.prepare(
        `INSERT INTO inventory(owner_id,product_id,source_id,source_url,name,item_type,printing,quantity,market_price,created_at,updated_at) VALUES(?,NULL,?,?,?,?,?,?,?,?,?) ON CONFLICT(owner_id,source_id,item_type) DO UPDATE SET source_url=excluded.source_url,name=excluded.name,quantity=inventory.quantity+excluded.quantity,market_price=excluded.market_price,updated_at=excluded.updated_at`,
      )
        .bind(
          user.id,
          sourceId,
          safeUrl,
          name,
          'merch',
          'Official Price',
          quantity,
          officialPrice,
          now,
          now,
        )
        .run();
    } else {
      const productId = Number(b.productId),
        printing =
          itemType === 'sealed'
            ? 'Sealed'
            : textValue(b.printing, 'Foil').trim().slice(0, 40),
        rawCost =
          b.unitCost === '' || b.unitCost == null ? null : Number(b.unitCost),
        taxable = rawCost != null && b.taxable === true ? 1 : 0,
        taxRate = taxable ? Number(b.taxRate) : 0,
        costSource =
          itemType === 'card' && b.costSource === 'pulled'
            ? 'pulled'
            : 'purchase';
      if (
        !Number.isInteger(productId) ||
        productId < 1 ||
        !name ||
        (rawCost != null &&
          (!Number.isFinite(rawCost) || rawCost < 0 || rawCost > 100000)) ||
        !Number.isFinite(taxRate) ||
        taxRate < 0 ||
        taxRate > 25
      )
        return Response.json({ errorCode: 'INCOMPLETE' }, { status: 400 });
      await env.DB.prepare(
        `INSERT INTO inventory(owner_id,product_id,name,item_type,printing,quantity,unit_cost,taxable,tax_rate,cost_source,created_at) VALUES(?,?,?,?,?,?,?,?,?,?,?) ON CONFLICT(owner_id,product_id,printing) DO UPDATE SET name=excluded.name,item_type=excluded.item_type,quantity=inventory.quantity+excluded.quantity,unit_cost=COALESCE(excluded.unit_cost,inventory.unit_cost),taxable=CASE WHEN excluded.unit_cost IS NULL THEN inventory.taxable ELSE excluded.taxable END,tax_rate=CASE WHEN excluded.unit_cost IS NULL THEN inventory.tax_rate ELSE excluded.tax_rate END,cost_source=CASE WHEN excluded.unit_cost IS NULL THEN inventory.cost_source ELSE excluded.cost_source END`,
      )
        .bind(
          user.id,
          productId,
          name,
          itemType,
          printing,
          quantity,
          rawCost,
          taxable,
          taxRate,
          costSource,
          now,
        )
        .run();
    }
    return Response.json({ items: await listInventory(user.id) });
  } catch (error) {
    if (error instanceof Response) return error;
    throw error;
  }
}
export async function PATCH(request: Request) {
  try {
    const user = await currentUser();
    const b = (await request.json()) as Record<string, unknown>;
    const id = Number(b.id);
    if (!Number.isInteger(id))
      return Response.json({ errorCode: 'INVALID_ID' }, { status: 400 });
    if (b.action === 'cost') {
      const rawCost =
          b.unitCost === '' || b.unitCost == null ? null : Number(b.unitCost),
        taxable = rawCost != null && b.taxable === true ? 1 : 0,
        taxRate = taxable ? Number(b.taxRate) : 0,
        costSource = b.costSource === 'pulled' ? 'pulled' : 'purchase';
      if (
        (rawCost != null &&
          (!Number.isFinite(rawCost) || rawCost < 0 || rawCost > 100000)) ||
        !Number.isFinite(taxRate) ||
        taxRate < 0 ||
        taxRate > 25
      )
        return Response.json({ errorCode: 'INCOMPLETE' }, { status: 400 });
      const result = await env.DB.prepare(
        `UPDATE inventory SET unit_cost=?,taxable=?,tax_rate=?,cost_source=CASE WHEN item_type='card' AND ?='pulled' THEN 'pulled' ELSE 'purchase' END WHERE id=? AND owner_id=? AND item_type!='merch'`,
      )
        .bind(rawCost, taxable, taxRate, costSource, id, user.id)
        .run();
      if (!result.meta.changes)
        return Response.json({ errorCode: 'NOT_FOUND' }, { status: 404 });
      const items = await listInventory(user.id);
      await recordDailyRoiSnapshots(user.id, items);
      return Response.json({ items });
    }
    const delta = Number(b.delta);
    if (![1, -1].includes(delta))
      return Response.json(
        { errorCode: 'INVALID_ADJUSTMENT' },
        { status: 400 },
      );
    const result = await env.DB.prepare(
      'UPDATE inventory SET quantity=MAX(1,quantity+?) WHERE id=? AND owner_id=?',
    )
      .bind(delta, id, user.id)
      .run();
    if (!result.meta.changes)
      return Response.json({ errorCode: 'NOT_FOUND' }, { status: 404 });
    const items = await listInventory(user.id);
    await recordDailyRoiSnapshots(user.id, items);
    return Response.json({ items });
  } catch (error) {
    if (error instanceof Response) return error;
    throw error;
  }
}
export async function DELETE(request: Request) {
  try {
    const user = await currentUser();
    const id = Number(new URL(request.url).searchParams.get('id'));
    if (!Number.isInteger(id))
      return Response.json({ errorCode: 'INVALID_ID' }, { status: 400 });
    const [, result] = await env.DB.batch([
      env.DB.prepare(
        'DELETE FROM roi_history WHERE inventory_id=? AND owner_id=?',
      ).bind(id, user.id),
      env.DB.prepare('DELETE FROM inventory WHERE id=? AND owner_id=?').bind(
        id,
        user.id,
      ),
    ]);
    if (!result.meta.changes)
      return Response.json({ errorCode: 'NOT_FOUND' }, { status: 404 });
    return Response.json({ ok: true });
  } catch (error) {
    if (error instanceof Response) return error;
    throw error;
  }
}
