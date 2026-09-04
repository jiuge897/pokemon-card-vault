import { getChatGPTUser } from '@/app/chatgpt-auth';

type Group = { groupId: number; name: string; publishedOn?: string };

export async function GET() {
  const user = await getChatGPTUser();
  if (!user)
    return Response.json({ errorCode: 'AUTH_REQUIRED' }, { status: 401 });
  try {
    const response = await fetch('https://tcgcsv.com/tcgplayer/3/groups', {
      headers: { 'user-agent': 'CardVault/8.1' },
      next: { revalidate: 60 * 60 * 12 },
    });
    if (!response.ok) throw new Error('groups');
    const groups = ((await response.json()) as { results?: Group[] }).results;
    if (!groups) throw new Error('groups');
    const now = Date.now();
    return Response.json({
      sets: groups
        .filter(
          (group) =>
            !group.publishedOn || new Date(group.publishedOn).getTime() <= now,
        )
        .sort(
          (a, b) =>
            new Date(b.publishedOn ?? 0).getTime() -
              new Date(a.publishedOn ?? 0).getTime() ||
            a.name.localeCompare(b.name),
        )
        .map((group) => ({ groupId: group.groupId, name: group.name })),
    });
  } catch {
    return Response.json({ errorCode: 'SETS_UNAVAILABLE' }, { status: 502 });
  }
}
