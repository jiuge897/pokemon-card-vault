import InventoryClient from './inventory-client';
import { chatGPTSignOutPath, requireChatGPTUser } from './chatgpt-auth';

export const dynamic = 'force-dynamic';

export default async function Home() {
  const user = await requireChatGPTUser('/');
  return <InventoryClient user={{ displayName: user.displayName, email: user.email }} signOutPath={chatGPTSignOutPath('/')} />;
}
