import { NextRequest } from "next/server";

const YT_API_KEY = process.env.YOUTUBE_API_KEY;
const CHANNEL_ID = process.env.YOUTUBE_CHANNEL_ID;
const MANUAL_VIDEOS = process.env.YOUTUBE_MANUAL_VIDEOS;

export async function GET(_request: NextRequest) {
  if (!YT_API_KEY) {
    return Response.json({ error: "YouTube API not configured" }, { status: 500 });
  }

  try {
    let url = "";
    if (MANUAL_VIDEOS) {
      // Fetch specific videos
      const ids = MANUAL_VIDEOS.split(",").map(s => s.trim()).filter(Boolean).join(",");
      url = `https://www.googleapis.com/youtube/v3/videos?key=${YT_API_KEY}&id=${ids}&part=snippet`;
    } else if (CHANNEL_ID) {
      // Fetch recent from channel
      url = `https://www.googleapis.com/youtube/v3/search?key=${YT_API_KEY}&channelId=${CHANNEL_ID}&part=snippet,id&order=date&maxResults=6&type=video`;
    } else {
      return Response.json({ error: "No channel or manual videos configured" }, { status: 500 });
    }

    const res = await fetch(url, { cache: "no-store" });
    const data = await res.json();

    if (!res.ok) {
      return Response.json({ error: data.error?.message || "YouTube API error" }, { status: 500 });
    }

    const videos = (data.items || []).map((item: any) => ({
      id: MANUAL_VIDEOS ? item.id : item.id.videoId, // /videos returns ID as string, /search returns object
      title: item.snippet.title,
      thumbnail: item.snippet.thumbnails.medium?.url || item.snippet.thumbnails.default?.url,
      publishedAt: item.snippet.publishedAt,
    }));

    return Response.json({ videos });
  } catch (err) {
    return Response.json({ error: "Failed to fetch videos" }, { status: 500 });
  }
}
