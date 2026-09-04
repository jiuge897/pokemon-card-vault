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
    `SELECT snapshot_date AS date,SUM(quantity*market_price) AS marketValue,SUM(quantity*market_price*cash_rate) AS adjustedValue,SUM(quantity*unit_cost*(1+CASE WHEN taxable=1 THEN tax_rate/100.0 ELSE 0 END)) AS cost FROM roi_history WHERE owner_id=? AND market_price IS NOT NULL AND unit_cost IS NOT NULL AND unit_cost>0 GROUP BY snapshot_date ORDER BY snapshot_date ASC LIMIT 730`,
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
