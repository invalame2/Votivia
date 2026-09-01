import { NextRequest } from "next/server";

const YT_API_KEY = process.env.YOUTUBE_API_KEY;
const CHANNEL_ID = process.env.YOUTUBE_CHANNEL_ID;
const MANUAL_VIDEOS = process.env.YOUTUBE_MANUAL_VIDEOS;

export async function GET(_request: NextRequest) {
  // If manual videos are configured, return them directly WITHOUT needing the API key.
  // YouTube thumbnails are publicly accessible without authentication.
  if (MANUAL_VIDEOS) {
    const ids = MANUAL_VIDEOS.split(",").map((s) => s.trim()).filter(Boolean);
    const videos = ids.map((id) => ({
      id,
      title: "",
      thumbnail: `https://img.youtube.com/vi/${id}/mqdefault.jpg`,
      publishedAt: new Date().toISOString(),
      manualMode: true,
    }));
    return Response.json({ videos });
  }

  // Fallback: use YouTube API for channel videos
  if (!YT_API_KEY) {
    return Response.json({ error: "YouTube API not configured" }, { status: 500 });
  }

  if (!CHANNEL_ID) {
    return Response.json({ error: "No channel or manual videos configured" }, { status: 500 });
  }

  try {
    const url = `https://www.googleapis.com/youtube/v3/search?key=${YT_API_KEY}&channelId=${CHANNEL_ID}&part=snippet,id&order=date&maxResults=6&type=video`;
    const res = await fetch(url, { cache: "no-store" });
    const data = await res.json();

    if (!res.ok) {
      return Response.json({ error: data.error?.message || "YouTube API error" }, { status: 500 });
    }

    const videos = (data.items || []).map((item: any) => ({
      id: item.id.videoId,
      title: item.snippet.title,
      thumbnail: item.snippet.thumbnails.medium?.url || item.snippet.thumbnails.default?.url,
      publishedAt: item.snippet.publishedAt,
      manualMode: false,
    }));

    return Response.json({ videos });
  } catch {
    return Response.json({ error: "Failed to fetch videos" }, { status: 500 });
  }
}
