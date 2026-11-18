/**
 * YouTube Data API v3 orqali mavzu bo'yicha video topish (server/skript tomonida).
 * Kvota: bitta qidiruv = 100 birlik, kunlik bepul limit = 10 000 (≈ 100 qidiruv).
 */
import axios from "axios";
import type { ContentLang, TopicVideo } from "./lesson-content";

/** Ishonchli kanallar. Yangi rasmiy kanal topilsa, ID'sini shu yerga qo'shing. */
export const OFFICIAL_CHANNELS: Record<string, string> = {
  UCTOhqyRkBAco2sqGaWyitOQ: "Multimedia markazi (Xalq ta'limi vazirligi)",
};

interface SearchItem {
  id: { videoId?: string };
  snippet: { title: string; channelId: string; channelTitle: string };
}

const decode = (s: string) =>
  s.replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/&amp;/g, "&").replace(/&lt;/g, "<").replace(/&gt;/g, ">");

export async function findVideo(query: string, lang: ContentLang, apiKey: string): Promise<TopicVideo | null> {
  const { data } = await axios.get<{ items?: SearchItem[] }>("https://www.googleapis.com/youtube/v3/search", {
    params: {
      part: "snippet",
      type: "video",
      maxResults: 8,
      q: query,
      key: apiKey,
      videoEmbeddable: "true",
      safeSearch: "strict",
      relevanceLanguage: lang === "tg" ? "tg" : "uz",
      regionCode: "UZ",
    },
    timeout: 30_000,
  });
  const items = (data.items ?? []).filter((i) => i.id.videoId);
  if (items.length === 0) return null;
  const pick = items.find((i) => i.snippet.channelId in OFFICIAL_CHANNELS) ?? items[0];
  return {
    id: pick.id.videoId as string,
    title: decode(pick.snippet.title),
    channel: decode(pick.snippet.channelTitle),
    official: pick.snippet.channelId in OFFICIAL_CHANNELS,
  };
}
