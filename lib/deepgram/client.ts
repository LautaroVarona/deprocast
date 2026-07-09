import { DeepgramClient } from "@deepgram/sdk";
import { getDeepgramConfig } from "@/lib/deepgram/config";

let cachedClient: DeepgramClient | null = null;

export function getDeepgramClient(): DeepgramClient {
  if (cachedClient) {
    return cachedClient;
  }

  const config = getDeepgramConfig();
  cachedClient = new DeepgramClient({ apiKey: config.apiKey });

  return cachedClient;
}
