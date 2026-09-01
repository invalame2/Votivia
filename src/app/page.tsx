import Image from "next/image";
import Link from "next/link";

interface YTVideo {
  id: string;
  title: string;
  thumbnail: string;
  publishedAt: string;
  manualMode?: boolean;
}

async function getYouTubeVideos(): Promise<YTVideo[]> {
  try {
    const manualVideos = process.env.YOUTUBE_MANUAL_VIDEOS;

    // If manual videos are configured, return them directly (no API key needed)
    if (manualVideos) {
      const ids = manualVideos.split(",").map((s) => s.trim()).filter(Boolean);
      return ids.map((id) => ({
        id,
        title: "",
        thumbnail: `https://img.youtube.com/vi/${id}/mqdefault.jpg`,
        publishedAt: new Date().toISOString(),
        manualMode: true,
      }));
    }

    // Fallback: fetch via API route (for channel mode)
    const baseUrl = process.env.VERCEL_URL
      ? `https://${process.env.VERCEL_URL}`
      : "http://localhost:3000";
    const res = await fetch(`${baseUrl}/api/youtube/recent`, {
      next: { revalidate: 3600 },
    });
    if (res.ok) {
      const data = await res.json();
      return data.videos || [];
    }
  } catch {}
  return [];
}


export default async function Home() {
  const videos = await getYouTubeVideos();

  return (
    <main className="flex flex-1 w-full max-w-6xl mx-auto px-4 py-8 md:py-16 flex-col lg:flex-row items-center justify-center gap-8 lg:gap-12">
      
      {/* Left Column */}
      <div className="flex flex-col items-center gap-8 w-full lg:w-1/2 lg:shrink-0">
        <div className="relative w-72 h-36 md:w-96 md:h-48">
          <Image
            src="/logo_votivia.png"
            alt="Votivia Logo"
            fill
            className="object-contain"
            priority
          />
        </div>

        <div className="flex flex-col gap-4 w-full max-w-sm">
          <Link
            href="/votiforo"
            id="btn-sugerencias"
            className="flex items-center justify-center bg-[#171717] border-[3px] border-black px-6 py-4 hover:bg-foreground hover:text-background transition-colors active:scale-95 rounded-xl w-full"
          >
            <span className="font-sans font-extrabold text-2xl text-center leading-tight">
              VotiForo
            </span>
          </Link>

          <Link
            href="/encuestas"
            id="btn-encuestas"
            className="flex items-center justify-center bg-[#171717] border-[3px] border-black px-6 py-4 hover:bg-foreground hover:text-background transition-colors active:scale-95 rounded-xl w-full"
          >
            <span className="font-sans font-extrabold text-2xl text-center leading-tight">
              Responder encuestas
            </span>
          </Link>
        </div>
      </div>

      {/* Right Column: YouTube Feed */}
      <div className="w-full lg:flex-1 bg-[#171717] border-[3px] border-black rounded-xl p-5 flex flex-col" style={{ minHeight: "420px" }}>
        <div className="flex justify-between items-center mb-5">
          <h2 className="font-black text-xl uppercase">Videos recientes</h2>
          <a
            href="https://youtube.com/@votivia_quiz"
            target="_blank"
            rel="noreferrer"
            className="flex items-center gap-2 text-red-500 border-[2px] border-black bg-background font-bold px-3 py-1 text-sm rounded-lg hover:bg-red-600 hover:text-white transition-colors"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
              <path d="M19.59 6.69a4.83 4.83 0 01-3.77-2.75 12.38 12.38 0 00-1.46-.11H9.64a12.08 12.08 0 00-1.46.11A4.83 4.83 0 014.41 6.69C3.18 8.17 3 10.16 3 12s.18 3.83 1.41 5.31A4.83 4.83 0 008.18 20.06a12.38 12.38 0 001.46.11h4.72a12.08 12.08 0 001.46-.11 4.83 4.83 0 003.77-2.75C20.82 15.83 21 13.84 21 12s-.18-3.83-1.41-5.31zM10 15.5v-7l6 3.5-6 3.5z"/>
            </svg>
            @votivia_quiz
          </a>
        </div>

        {videos.length > 0 ? (
          <div
            className="flex flex-col gap-2 overflow-y-auto flex-1 pr-1"
            style={{ maxHeight: "calc(3 * 90px + 2 * 8px)" }}
          >
            {videos.map((v) => (
              <a
                key={v.id}
                href={`https://youtube.com/watch?v=${v.id}`}
                target="_blank"
                rel="noreferrer"
                className="flex items-center gap-3 border-[2px] border-black bg-background hover:bg-surface-hover transition-colors group shrink-0"
                style={{ height: "90px" }}
              >
                {/* Thumbnail */}
                <div className="relative shrink-0 bg-black overflow-hidden" style={{ width: "140px", height: "90px" }}>
                  <img
                    src={v.thumbnail}
                    alt={v.title || "Video de YouTube"}
                    className="w-full h-full object-cover"
                  />
                  <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity bg-black/30">
                    <div className="bg-red-600 text-white font-black px-2 py-1 text-xs border-[2px] border-black">▶</div>
                  </div>
                </div>
                {/* Info */}
                <div className="flex-1 min-w-0 py-2 pr-3">
                  <p className="text-xs font-bold text-foreground leading-snug line-clamp-2">
                    {v.title || (
                      <span className="text-muted italic">Ver en YouTube →</span>
                    )}
                  </p>
                  <p className="text-[10px] text-muted mt-1 font-bold">
                    {v.manualMode
                      ? "YouTube"
                      : new Date(v.publishedAt).toLocaleDateString("es", { day: "numeric", month: "short", year: "numeric" })
                    }
                  </p>
                </div>
              </a>
            ))}
          </div>
        ) : (
          <div className="flex-1 border-[3px] border-black bg-background flex flex-col items-center justify-center text-center p-6 rounded-xl">
            <svg xmlns="http://www.w3.org/2000/svg" width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="mb-3 text-red-600">
              <path d="M22.54 6.42a2.78 2.78 0 0 0-1.94-2C18.88 4 12 4 12 4s-6.88 0-8.6.46a2.78 2.78 0 0 0-1.94 2A29 29 0 0 0 1 11.75a29 29 0 0 0 .46 5.33 2.78 2.78 0 0 0 1.94 2c1.72.46 8.6.46 8.6.46s6.88 0 8.6-.46a2.78 2.78 0 0 0 1.94-2 29 29 0 0 0 .46-5.33 29 29 0 0 0-.46-5.33z"></path>
              <polygon points="9.75 15.02 15.5 11.75 9.75 8.48 9.75 15.02"></polygon>
            </svg>
            <p className="font-bold text-muted text-sm">Sin videos configurados.</p>
          </div>
        )}
      </div>
    </main>
  );
}
