import type { ChatMessage } from './types';
import { getStorage } from './storage';

const QUEUE_KEY = 'MC_outgoing_queue';
const MAX_ATTEMPTS = 5;

async function readQueue(): Promise<ChatMessage[]> {
  const raw = await getStorage().getItem(QUEUE_KEY);
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

async function writeQueue(queue: ChatMessage[]): Promise<void> {
  await getStorage().setItem(QUEUE_KEY, JSON.stringify(queue));
}

export async function enqueueMessage(message: ChatMessage): Promise<void> {
  const queue = await readQueue();
  queue.push(message);
  await writeQueue(queue);
}

export async function markSent(tempId: string): Promise<void> {
  const queue = await readQueue();
  await writeQueue(queue.filter((m) => m.tempId !== tempId));
}

export async function markFailed(tempId: string): Promise<ChatMessage | null> {
  const queue = await readQueue();
  const item = queue.find((m) => m.tempId === tempId);
  if (!item) return null;
  item.attempts = (item.attempts ?? 0) + 1;
  item.status = item.attempts >= MAX_ATTEMPTS ? 'failed' : 'pending';
  await writeQueue(queue);
  return item;
}

export async function getPendingMessages(): Promise<ChatMessage[]> {
  const queue = await readQueue();
  return queue.filter((m) => m.status !== 'failed');
}

export { MAX_ATTEMPTS };
