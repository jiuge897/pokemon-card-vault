import { env } from 'cloudflare:workers';
import { getChatGPTUser } from '@/app/chatgpt-auth';
import { listInventory, recordDailyRoiSnapshots } from '@/lib/inventory-db';

type PricePoint = { printingType: string; marketPrice: number | null };

function selectPrice(
  points: PricePoint[],
  printing: string,
  itemType: 'card' | 'sealed' | 'merch',
) {
  if (itemType === 'merch') return null;
  if (itemType === 'sealed')
    return (
      points.find((point) => point.marketPrice != null)?.marketPrice ?? null
    );
  const normalized = printing.toLowerCase().replaceAll(/[^a-z]/g, '');
  const exact = points.find(
    (point) =>
      point.printingType.toLowerCase().replaceAll(/[^a-z]/g, '') === normalized,
  );
  return (
    (exact || points.find((point) => point.marketPrice != null))?.marketPrice ??
    null
  );
}

export async function POST(request: Request) {
  const user = await getChatGPTUser();
  if (!user)
    return Response.json({ errorCode: 'AUTH_REQUIRED' }, { status: 401 });
  const { force = false } = (await request.json().catch(() => ({}))) as {
    force?: boolean;
  };
  const items = await listInventory(user.id);
  const stale = Date.now() - 86_400_000;
  const due = items.filter(
    (item) =>
      item.itemType !== 'merch' &&
      (force || !item.updatedAt || new Date(item.updatedAt).getTime() < stale),
  );
  let updated = 0;
  for (const item of due) {
    if (!item.productId) continue;
    try {
      const response = await fetch(
        `https://mpapi.tcgplayer.com/v2/product/${item.productId}/pricepoints`,
        { headers: { 'user-agent': 'CardVault/8.1' } },
      );
      if (!response.ok) continue;
      const price = selectPrice(
        (await response.json()) as PricePoint[],
        item.printing,
        item.itemType,
      );
      await env.DB.prepare(
        'UPDATE inventory SET market_price=?,updated_at=? WHERE id=? AND owner_id=?',
      )
        .bind(price, new Date().toISOString(), item.id, user.id)
        .run();
      updated++;
    } catch {}
  }
  const freshItems = await listInventory(user.id);
  await recordDailyRoiSnapshots(user.id, freshItems);
  return Response.json({ items: freshItems, updated });
}
