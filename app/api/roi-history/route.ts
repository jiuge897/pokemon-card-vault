import { env } from 'cloudflare:workers';
import { getChatGPTUser } from '@/app/chatgpt-auth';

type AggregateRow = {
  date: string;
  marketValue: number;
  adjustedValue: number;
  cost: number;
};

export async function GET() {
  const user = await getChatGPTUser();
  if (!user)
    return Response.json({ errorCode: 'AUTH_REQUIRED' }, { status: 401 });
  const result = await env.DB.prepare(
    `SELECT h.snapshot_date AS date,
      SUM(CASE WHEN i.status='sold' AND h.snapshot_date>=i.sold_at THEN COALESCE(i.sold_price,0) ELSE h.quantity*h.market_price END) AS marketValue,
      SUM(CASE WHEN i.status='sold' AND h.snapshot_date>=i.sold_at THEN COALESCE(i.sold_price,0) ELSE h.quantity*h.market_price*h.cash_rate END) AS adjustedValue,
      SUM(h.quantity*h.unit_cost*(1+CASE WHEN h.taxable=1 THEN h.tax_rate/100.0 ELSE 0 END)) AS cost
    FROM roi_history h JOIN inventory i ON i.id=h.inventory_id AND i.owner_id=h.owner_id
    WHERE h.owner_id=? AND h.market_price IS NOT NULL AND h.unit_cost IS NOT NULL AND h.unit_cost>0
    GROUP BY h.snapshot_date ORDER BY h.snapshot_date ASC LIMIT 730`,
  )
    .bind(user.id)
    .all<AggregateRow>();
  return Response.json({
    history: result.results
      .filter((row) => row.cost > 0)
      .map((row) => ({
        date: row.date,
        marketRoi: ((row.marketValue - row.cost) / row.cost) * 100,
        adjustedRoi: ((row.adjustedValue - row.cost) / row.cost) * 100,
      })),
  });
}
