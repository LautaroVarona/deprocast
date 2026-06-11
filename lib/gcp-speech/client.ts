import { v2 } from "@google-cloud/speech";
import { getGcpSpeechConfig } from "@/lib/gcp-speech/config";

let cachedClient: v2.SpeechClient | null = null;

export function getSpeechClient(): v2.SpeechClient {
  if (cachedClient) {
    return cachedClient;
  }

  const config = getGcpSpeechConfig();
  cachedClient = new v2.SpeechClient({
    apiEndpoint: config.apiEndpoint,
  });

  return cachedClient;
}
