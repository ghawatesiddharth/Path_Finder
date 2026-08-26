// Browser-side YouTube Data API v3 wrapper.
// Get a free key: https://console.cloud.google.com/apis/library/youtube.googleapis.com
// Stored client-side in localStorage under 'yt_api_key' (see store.tsx).
// Falls back to deterministic mock results (with placeholder banners) if no key is set,
// so the app still runs end-to-end for demos without an API key.

const SEARCH_URL = 'https://www.googleapis.com/youtube/v3/search';
const PLAYLIST_ITEMS_URL = 'https://www.googleapis.com/youtube/v3/playlistItems';

export interface VideoResult {
  title: string;
  channel: string;
  channelId: string | null;
  url: string;
  thumbnail: string | null;
}

export interface PlaylistResult {
  playlistId: string;
  title: string;
  channel: string;
  thumbnail: string | null;
  url: string;
}

// Minimal shapes for the parts of the YouTube API response we actually read.
interface YTThumbnails {
  default?: { url: string };
  medium?: { url: string };
}
interface YTSearchItem {
  id: { videoId?: string; playlistId?: string };
  snippet: {
    title: string;
    channelTitle: string;
    channelId: string;
    thumbnails?: YTThumbnails;
  };
}
interface YTPlaylistItem {
  snippet: {
    title: string;
    channelTitle?: string;
    videoOwnerChannelTitle?: string;
    resourceId?: { videoId?: string };
    thumbnails?: YTThumbnails;
  };
}

function mockResults(query: string, maxResults: number): VideoResult[] {
  return Array.from({ length: maxResults }, () => ({
    title: `${query} — Full Tutorial`,
    channel: 'Demo Channel (add a YouTube API key for live results)',
    channelId: null,
    url: `https://www.youtube.com/results?search_query=${encodeURIComponent(query)}`,
    thumbnail: `https://placehold.co/320x180/1a1d24/d4ff4d?text=${encodeURIComponent(query.slice(0, 24))}`,
  }));
}

export async function searchVideos(
  query: string,
  apiKey: string | null,
  maxResults = 1,
  channelId: string | null = null,
): Promise<VideoResult[]> {
  if (!apiKey) return mockResults(query, maxResults);
  const params = new URLSearchParams({
    part: 'snippet',
    q: query,
    type: 'video',
    maxResults: String(maxResults),
    relevanceLanguage: 'en',
    order: 'relevance',
    key: apiKey,
  });
  if (channelId) params.set('channelId', channelId);
  try {
    const res = await fetch(`${SEARCH_URL}?${params}`);
    if (!res.ok) throw new Error(String(res.status));
    const data = await res.json();
    const items = (data.items ?? []) as YTSearchItem[];
    const out: VideoResult[] = items.map((it) => ({
      title: it.snippet.title,
      channel: it.snippet.channelTitle,
      channelId: it.snippet.channelId,
      url: `https://www.youtube.com/watch?v=${it.id.videoId}`,
      thumbnail: it.snippet.thumbnails?.medium?.url ?? null,
    }));
    if (out.length) return out;
    return channelId ? [] : mockResults(query, maxResults);
  } catch (err) {
    console.warn('YouTube search failed, showing placeholder results:', err);
    return mockResults(query, maxResults);
  }
}

export async function findTopicChannel(
  topic: string,
  apiKey: string | null,
): Promise<{ channelId: string; channelTitle: string } | null> {
  const results = await searchVideos(`${topic} full course`, apiKey, 1);
  if (results[0]?.channelId) {
    return { channelId: results[0].channelId, channelTitle: results[0].channel };
  }
  return null;
}

export async function searchPlaylists(
  query: string,
  apiKey: string | null,
  maxResults = 1,
): Promise<PlaylistResult[]> {
  if (!apiKey) return [];
  const params = new URLSearchParams({
    part: 'snippet',
    q: query,
    type: 'playlist',
    maxResults: String(maxResults),
    relevanceLanguage: 'en',
    order: 'relevance',
    key: apiKey,
  });
  try {
    const res = await fetch(`${SEARCH_URL}?${params}`);
    if (!res.ok) throw new Error(String(res.status));
    const data = await res.json();
    const items = (data.items ?? []) as YTSearchItem[];
    return items.map((it) => ({
      playlistId: it.id.playlistId!,
      title: it.snippet.title,
      channel: it.snippet.channelTitle,
      thumbnail: it.snippet.thumbnails?.medium?.url ?? null,
      url: `https://www.youtube.com/playlist?list=${it.id.playlistId}`,
    }));
  } catch (err) {
    console.warn('YouTube playlist search failed:', err);
    return [];
  }
}

export async function getPlaylistVideos(
  playlistId: string,
  apiKey: string | null,
  maxResults = 10,
): Promise<VideoResult[]> {
  if (!apiKey) return [];
  const params = new URLSearchParams({
    part: 'snippet',
    playlistId,
    maxResults: String(maxResults),
    key: apiKey,
  });
  try {
    const res = await fetch(`${PLAYLIST_ITEMS_URL}?${params}`);
    if (!res.ok) throw new Error(String(res.status));
    const data = await res.json();
    const items = (data.items ?? []) as YTPlaylistItem[];
    return items
      .filter((it) => it.snippet?.resourceId?.videoId)
      .map((it) => ({
        title: it.snippet.title,
        channel: it.snippet.videoOwnerChannelTitle ?? it.snippet.channelTitle ?? '',
        channelId: null,
        url: `https://www.youtube.com/watch?v=${it.snippet.resourceId!.videoId}`,
        thumbnail: it.snippet.thumbnails?.medium?.url ?? it.snippet.thumbnails?.default?.url ?? null,
      }));
  } catch (err) {
    console.warn('YouTube playlist videos fetch failed:', err);
    return [];
  }
}
