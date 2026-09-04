import { getChatGPTUser } from '@/app/chatgpt-auth';

type Group = { groupId: number; name: string; abbreviation?: string };
type ProductDetails = { setId?: number };
type Product = { productId: number; name: string; groupId: number };
type Price = {
  productId: number;
  marketPrice: number | null;
  subTypeName: string;
};

const headers = { 'user-agent': 'CardVault/8.1' };

function searchable(value: string) {
  return value
    .toLowerCase()
    .replace(/%[0-9a-f]{2}/gi, ' ')
    .replace(/[^a-z0-9]+/g, ' ')
    .replace(
      /\b(pokemon|tcgplayer|product|card|cards|english|foil|normal)\b/g,
      ' ',
    )
    .replace(/\s+/g, ' ')
    .trim();
}

function inferGroup(groups: Group[], sourceUrl: string) {
  const haystack = searchable(sourceUrl);
  if (!haystack) return null;
  const haystackTokens = new Set(haystack.split(' '));
  const ranked = groups
    .map((group) => {
      const tokens = searchable(`${group.name} ${group.abbreviation ?? ''}`)
        .split(' ')
        .filter((token) => token.length > 1 || /^\d+$/.test(token));
      const matched = tokens.filter((token) => haystackTokens.has(token));
      const meaningful = matched.filter(
        (token) => token.length >= 4 || /^\d+$/.test(token),
      );
      return {
        group,
        score: matched.length * 2 + meaningful.length * 3,
        meaningful: meaningful.length,
      };
    })
    .sort((a, b) => b.score - a.score);
  const best = ranked[0];
  const runnerUp = ranked[1];
  return best &&
    best.meaningful > 0 &&
    best.score >= 5 &&
    (!runnerUp || best.score > runnerUp.score)
    ? best.group
    : null;
}

async function loadGroups() {
  const response = await fetch('https://tcgcsv.com/tcgplayer/3/groups', {
    headers,
    next: { revalidate: 60 * 60 * 12 },
  });
  if (!response.ok) throw new Error('groups');
  const groups = ((await response.json()) as { results?: Group[] }).results;
  if (!groups) throw new Error('groups');
  return groups;
}

async function loadProductGroupId(productId: number) {
  const response = await fetch(
    `https://mp-search-api.tcgplayer.com/v1/product/${productId}/details`,
    {
      headers,
      next: { revalidate: 60 * 60 * 12 },
    },
  );
  if (!response.ok) return null;
  const details = (await response.json()) as ProductDetails;
  const setId = Number(details.setId);
  return Number.isInteger(setId) && setId > 0 ? setId : null;
}

export async function POST(request: Request) {
  const user = await getChatGPTUser();
  if (!user)
    return Response.json({ errorCode: 'AUTH_REQUIRED' }, { status: 401 });
  const body = (await request.json().catch(() => ({}))) as {
    productId?: number;
    groupId?: number;
    sourceUrl?: string;
  };
  const productId = Number(body.productId);
  if (!Number.isInteger(productId) || productId < 1)
    return Response.json({ errorCode: 'INVALID_ID' }, { status: 400 });
  try {
    const groups = await loadGroups();
    const requestedGroupId = Number(body.groupId);
    const detectedGroupId = Number.isInteger(requestedGroupId)
      ? requestedGroupId
      : await loadProductGroupId(productId);
    const group =
      groups.find((candidate) => candidate.groupId === detectedGroupId) ??
      inferGroup(groups, String(body.sourceUrl ?? ''));
    if (!group)
      return Response.json({ errorCode: 'SET_REQUIRED' }, { status: 409 });

    const [productsResponse, pricesResponse] = await Promise.all([
      fetch(`https://tcgcsv.com/tcgplayer/3/${group.groupId}/products`, {
        headers,
        next: { revalidate: 60 * 60 * 12 },
      }),
      fetch(`https://tcgcsv.com/tcgplayer/3/${group.groupId}/prices`, {
        headers,
        next: { revalidate: 60 * 60 * 12 },
      }),
    ]);
    if (!productsResponse.ok || !pricesResponse.ok) throw new Error('catalog');
    const products = (
      (await productsResponse.json()) as { results?: Product[] }
    ).results;
    const prices = ((await pricesResponse.json()) as { results?: Price[] })
      .results;
    if (!products || !prices) throw new Error('catalog');
    const packs = products
      .filter(
        (product) =>
          /booster pack/i.test(product.name) &&
          !/(code card|blister|bundle|box|case|lot|art set)/i.test(
            product.name,
          ),
      )
      .sort((a, b) => {
        const exactA = /booster pack$/i.test(a.name) ? 0 : 1;
        const exactB = /booster pack$/i.test(b.name) ? 0 : 1;
        return exactA - exactB || a.name.length - b.name.length;
      });
    for (const pack of packs) {
      const candidates = prices.filter(
        (price) =>
          price.productId === pack.productId && price.marketPrice != null,
      );
      const price =
        candidates.find((candidate) => /normal/i.test(candidate.subTypeName)) ??
        candidates[0];
      if (price?.marketPrice != null && price.marketPrice > 0)
        return Response.json({
          price: price.marketPrice,
          packName: pack.name,
          productId: pack.productId,
          groupId: group.groupId,
          groupName: group.name,
          date: new Date().toISOString().slice(0, 10),
        });
    }
  } catch {}
  return Response.json({ errorCode: 'PACK_PRICE_NOT_FOUND' }, { status: 404 });
}
