import { env } from 'cloudflare:workers';
import { getChatGPTUser } from '@/app/chatgpt-auth';

type BoardRow = {
  ownerId: string;
  nickname: string;
  hideValue: number;
  portfolioValue: number;
  totalCost: number;
  totalOutcome: number;
  missedGain: number;
  avoidedLoss: number;
};

export async function GET() {
  const user = await getChatGPTUser();
  if (!user)
    return Response.json({ errorCode: 'AUTH_REQUIRED' }, { status: 401 });
  const profile = await env.DB.prepare(
    `SELECT nickname,visibility,hide_portfolio_value AS hideValue FROM leaderboard_profiles WHERE owner_id=?`,
  )
    .bind(user.id)
    .first();
  const rows = await env.DB.prepare(
    `SELECT p.owner_id AS ownerId,p.nickname,p.hide_portfolio_value AS hideValue,
      SUM(CASE WHEN i.status='holding' THEN COALESCE(i.market_price,0)*i.quantity ELSE 0 END) AS portfolioValue,
      SUM(CASE WHEN i.unit_cost IS NOT NULL THEN i.unit_cost*(1+CASE WHEN i.taxable=1 THEN i.tax_rate/100.0 ELSE 0 END)*i.quantity ELSE 0 END) AS totalCost,
      SUM(CASE WHEN i.status='sold' THEN COALESCE(i.sold_price,0) ELSE COALESCE(i.market_price,0)*i.quantity END) AS totalOutcome,
      MAX(CASE WHEN i.status='sold' THEN MAX(COALESCE(i.market_price,0)*i.quantity-COALESCE(i.sold_price,0),0) ELSE 0 END) AS missedGain,
      MAX(CASE WHEN i.status='sold' THEN MAX(COALESCE(i.sold_price,0)-COALESCE(i.market_price,0)*i.quantity,0) ELSE 0 END) AS avoidedLoss
    FROM leaderboard_profiles p JOIN inventory i ON i.owner_id=p.owner_id
    WHERE p.visibility='public' GROUP BY p.owner_id,p.nickname,p.hide_portfolio_value`,
  ).all<BoardRow>();
  const normalized = rows.results.map((row) => ({
    nickname: row.nickname,
    portfolioValue: row.hideValue ? null : row.portfolioValue,
    portfolioPercentileOnly: Boolean(row.hideValue),
    roi:
      row.totalCost > 0
        ? ((row.totalOutcome - row.totalCost) / row.totalCost) * 100
        : null,
    missedGain: row.missedGain,
    avoidedLoss: row.avoidedLoss,
    isCurrentUser: row.ownerId === user.id,
  }));
  return Response.json({ profile: profile ?? null, entries: normalized });
}

export async function PUT(request: Request) {
  const user = await getChatGPTUser();
  if (!user)
    return Response.json({ errorCode: 'AUTH_REQUIRED' }, { status: 401 });
  const body = (await request.json()) as Record<string, unknown>;
  const nickname =
    typeof body.nickname === 'string' ? body.nickname.trim().slice(0, 30) : '';
  const visibility = body.visibility === 'public' ? 'public' : 'private';
  const hideValue = body.hidePortfolioValue === true ? 1 : 0;
  if (!nickname)
    return Response.json({ errorCode: 'INCOMPLETE' }, { status: 400 });
  await env.DB.prepare(
    `INSERT INTO leaderboard_profiles(owner_id,nickname,visibility,hide_portfolio_value,updated_at) VALUES(?,?,?,?,?) ON CONFLICT(owner_id) DO UPDATE SET nickname=excluded.nickname,visibility=excluded.visibility,hide_portfolio_value=excluded.hide_portfolio_value,updated_at=excluded.updated_at`,
  )
    .bind(user.id, nickname, visibility, hideValue, new Date().toISOString())
    .run();
  return Response.json({ ok: true });
}
