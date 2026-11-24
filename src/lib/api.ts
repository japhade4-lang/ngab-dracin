import { Drama, DramaSource, Episode } from '@/types/drama';

const DRAMABUZZ_KEY =
  process.env.DRAMABUZZ_KEY ||
  process.env.NEXT_PUBLIC_DRAMABUZZ_KEY ||
  'B6860FC6979E745EF0C85B5E3496B5D2';

const DRAMABUZZ_BASE = process.env.NEXT_PUBLIC_DRAMABUZZ_API_URL || 'https://api.dramabuzz.sbs';
const DRAMABOX_BASE = process.env.DRAMABOX_API_URL || 'https://dramabox.goodbos.online';
const SHORTMAX_BASE = process.env.SHORTMAX_API_URL || 'https://shortmax.goodbos.online';
const NETSHORT_BASE = process.env.NETSHORT_API_URL || 'https://netshort.goodbos.online';

export interface DramabuzzPlatform {
  id: string;
  name: string;
  status: string;
  logo: string;
  api: string | null;
}

export interface DramabuzzStatusResponse {
  success: boolean;
  timestamp: string;
  summary: {
    total: number;
    has_api: number;
    no_api: number;
  };
  platforms: DramabuzzPlatform[];
}

// Lightweight episode/detail lookup cache for playback navigation
const episodeCache = new Map<string, any[]>();
const dramaDetailCache = new Map<string, Drama>();

function interleaveAndDedupe(lists: Drama[][]): Drama[] {
  const result: Drama[] = [];
  const seen = new Set<string>();
  const maxLen = Math.max(0, ...lists.map((l) => l.length));

  for (let i = 0; i < maxLen; i++) {
    for (const list of lists) {
      const item = list[i];
      if (!item || !item.id) continue;
      const key = `${item.source}_${item.id}`;
      if (!seen.has(key)) {
        seen.add(key);
        result.push(item);
      }
    }
  }
  return result;
}

/**
 * Fetch platform status from master Dramabuzz gateway
 */
export async function fetchDramabuzzStatus(): Promise<DramabuzzStatusResponse | null> {
  try {
    const res = await fetch(`${DRAMABUZZ_BASE}/api/status?key=${DRAMABUZZ_KEY}`, {
      next: { revalidate: 300 },
      signal: AbortSignal.timeout(4000),
    });
    if (res.ok) {
      return await res.json();
    }
  } catch (err) {
    console.warn('[Dramabuzz] Failed to fetch status:', err);
  }
  return null;
}

/**
 * Fetch LIVE Trending Sekarang across DramaBox Trending + ShortMax Ranking & Hot
 */
export async function fetchTrending(_source: DramaSource = 'dramabox'): Promise<Drama[]> {
  const [dbRes, smRankRes, smHotRes] = await Promise.allSettled([
    fetch(`${DRAMABOX_BASE}/api/dramabox/trending?lang=in`, {
      headers: { 'x-token': DRAMABUZZ_KEY },
      next: { revalidate: 60 },
      signal: AbortSignal.timeout(4500),
    }),
    fetch(`${SHORTMAX_BASE}/api/v1/ranking?lang=id&code=${DRAMABUZZ_KEY}`, {
      next: { revalidate: 60 },
      signal: AbortSignal.timeout(4500),
    }),
    fetch(`${SHORTMAX_BASE}/api/v1/hot?lang=id&code=${DRAMABUZZ_KEY}`, {
      next: { revalidate: 60 },
      signal: AbortSignal.timeout(4500),
    }),
  ]);

  const dbList: Drama[] = [];
  if (dbRes.status === 'fulfilled' && dbRes.value.ok) {
    try {
      const data = await dbRes.value.json();
      if (Array.isArray(data)) {
        for (const item of data) {
          const d = normalizeDramaboxItem(item);
          dbList.push(d);
          dramaDetailCache.set(`dramabox_${d.id}`, d);
        }
      }
    } catch {}
  }

  const smList: Drama[] = [];
  for (const res of [smRankRes, smHotRes]) {
    if (res.status === 'fulfilled' && res.value.ok) {
      try {
        const json = await res.value.json();
        const items = json?.data || [];
        if (Array.isArray(items)) {
          for (const item of items) {
            const d = normalizeShortmaxItem(item);
            smList.push(d);
            dramaDetailCache.set(`shortmax_${d.id}`, d);
          }
        }
      } catch {}
    }
  }

  const merged = interleaveAndDedupe([dbList, smList]);
  return merged.length > 0 ? merged : FALLBACK_DRAMAS;
}

/**
 * Fetch LIVE Terbaru / Baru Rilis across DramaBox Latest + ShortMax New
 */
export async function fetchLatestDramas(limit: number = 40): Promise<Drama[]> {
  const [dbRes, smRes] = await Promise.allSettled([
    fetch(`${DRAMABOX_BASE}/api/dramabox/latest?lang=in`, {
      headers: { 'x-token': DRAMABUZZ_KEY },
      next: { revalidate: 60 },
      signal: AbortSignal.timeout(4500),
    }),
    fetch(`${SHORTMAX_BASE}/api/v1/new?lang=id&code=${DRAMABUZZ_KEY}`, {
      next: { revalidate: 60 },
      signal: AbortSignal.timeout(4500),
    }),
  ]);

  const dbList: Drama[] = [];
  if (dbRes.status === 'fulfilled' && dbRes.value.ok) {
    try {
      const data = await dbRes.value.json();
      if (Array.isArray(data)) {
        for (const item of data) {
          const d = normalizeDramaboxItem(item);
          dbList.push(d);
          dramaDetailCache.set(`dramabox_${d.id}`, d);
        }
      }
    } catch {}
  }

  const smList: Drama[] = [];
  if (smRes.status === 'fulfilled' && smRes.value.ok) {
    try {
      const json = await smRes.value.json();
      const items = json?.data || [];
      if (Array.isArray(items)) {
        for (const item of items) {
          const d = normalizeShortmaxItem(item);
          smList.push(d);
          dramaDetailCache.set(`shortmax_${d.id}`, d);
        }
      }
    } catch {}
  }

  const merged = interleaveAndDedupe([dbList, smList]);
  if (merged.length > 0) {
    return merged.slice(0, limit);
  }

  return (await fetchTrending()).slice(0, limit);
}

/**
 * Fetch LIVE Rekomendasi For You (DramaBox ForYou + ShortMax VIP)
 */
export async function fetchForYou(_source: DramaSource = 'dramabox'): Promise<Drama[]> {
  const [dbForYouRes, smVipRes, dbBrowseRes] = await Promise.allSettled([
    fetch(`${DRAMABOX_BASE}/api/dramabox/foryou?lang=in`, {
      headers: { 'x-token': DRAMABUZZ_KEY },
      next: { revalidate: 60 },
      signal: AbortSignal.timeout(4500),
    }),
    fetch(`${SHORTMAX_BASE}/api/v1/vip?lang=id&code=${DRAMABUZZ_KEY}`, {
      next: { revalidate: 60 },
      signal: AbortSignal.timeout(4500),
    }),
    fetch(`${DRAMABOX_BASE}/api/dramabox/browse?page=1&lang=in`, {
      headers: { 'x-token': DRAMABUZZ_KEY },
      next: { revalidate: 60 },
      signal: AbortSignal.timeout(4500),
    }),
  ]);

  const dbList: Drama[] = [];
  if (dbForYouRes.status === 'fulfilled' && dbForYouRes.value.ok) {
    try {
      const data = await dbForYouRes.value.json();
      const items = Array.isArray(data) ? data : data?.items || [];
      for (const item of items) {
        const d = normalizeDramaboxItem(item);
        dbList.push(d);
        dramaDetailCache.set(`dramabox_${d.id}`, d);
      }
    } catch {}
  }

  if (dbBrowseRes.status === 'fulfilled' && dbBrowseRes.value.ok) {
    try {
      const data = await dbBrowseRes.value.json();
      const items = data?.items || [];
      if (Array.isArray(items)) {
        for (const item of items) {
          const d = normalizeDramaboxItem(item);
          dbList.push(d);
          dramaDetailCache.set(`dramabox_${d.id}`, d);
        }
      }
    } catch {}
  }

  const smList: Drama[] = [];
  if (smVipRes.status === 'fulfilled' && smVipRes.value.ok) {
    try {
      const json = await smVipRes.value.json();
      const items = json?.data || [];
      if (Array.isArray(items)) {
        for (const item of items) {
          const d = normalizeShortmaxItem(item);
          smList.push(d);
          dramaDetailCache.set(`shortmax_${d.id}`, d);
        }
      }
    } catch {}
  }

  const merged = interleaveAndDedupe([dbList, smList]);
  if (merged.length > 0) {
    return merged;
  }

  return await fetchTrending();
}

/**
 * Fetch LIVE Indonesian Dubbed Dramas (DramaBox /dubbed + ShortMax Dubbing)
 */
export async function fetchDubbedDramas(): Promise<Drama[]> {
  const [dbDubRes, smHotRes, smPopRes] = await Promise.allSettled([
    fetch(`${DRAMABOX_BASE}/api/dramabox/dubbed?classify=terpopuler&page=1&lang=in`, {
      headers: { 'x-token': DRAMABUZZ_KEY },
      next: { revalidate: 60 },
      signal: AbortSignal.timeout(4500),
    }),
    fetch(`${SHORTMAX_BASE}/api/v1/hot?lang=id&code=${DRAMABUZZ_KEY}`, {
      next: { revalidate: 60 },
      signal: AbortSignal.timeout(4500),
    }),
    fetch(`${SHORTMAX_BASE}/api/v1/popular?lang=id&code=${DRAMABUZZ_KEY}`, {
      next: { revalidate: 60 },
      signal: AbortSignal.timeout(4500),
    }),
  ]);

  const dbList: Drama[] = [];
  if (dbDubRes.status === 'fulfilled' && dbDubRes.value.ok) {
    try {
      const data = await dbDubRes.value.json();
      const items = Array.isArray(data) ? data : data?.items || [];
      for (const item of items) {
        const d = normalizeDramaboxItem(item);
        d.isDubbed = true;
        dbList.push(d);
        dramaDetailCache.set(`dramabox_${d.id}`, d);
      }
    } catch {}
  }

  const smList: Drama[] = [];
  for (const res of [smHotRes, smPopRes]) {
    if (res.status === 'fulfilled' && res.value.ok) {
      try {
        const json = await res.value.json();
        const items = json?.data || [];
        if (Array.isArray(items)) {
          for (const item of items) {
            const d = normalizeShortmaxItem(item);
            if (d.isDubbed) {
              smList.push(d);
              dramaDetailCache.set(`shortmax_${d.id}`, d);
            }
          }
        }
      } catch {}
    }
  }

  const merged = interleaveAndDedupe([dbList, smList]);
  if (merged.length > 0) {
    return merged;
  }

  return FALLBACK_DRAMAS.filter((d) => d.isDubbed);
}

/**
 * Fetch Drama Details (synopsis, total episodes, author, cover)
 */
export async function fetchDramaDetail(source: DramaSource, id: string): Promise<Drama | null> {
  const cached = dramaDetailCache.get(`${source}_${id}`);
  if (cached && cached.totalEpisodes && cached.totalEpisodes > 0) {
    return cached;
  }

  // 1. If DramaBox, fetch detail endpoint
  if (source === 'dramabox') {
    try {
      const detailRes = await fetch(
        `${DRAMABOX_BASE}/api/dramabox/detail?bookId=${encodeURIComponent(id)}`,
        {
          headers: { 'x-token': DRAMABUZZ_KEY },
          next: { revalidate: 300 },
          signal: AbortSignal.timeout(4000),
        }
      );
      if (detailRes.ok) {
        const item = await detailRes.json();
        if (item && item.bookName) {
          const drama = normalizeDramaboxItem(item);
          dramaDetailCache.set(`dramabox_${id}`, drama);
          return drama;
        }
      }
    } catch (err) {
      console.warn('[API] DramaBox detail error:', err);
    }
  }

  // 2. If ShortMax, fetch alleps
  if (source === 'shortmax') {
    try {
      const res = await fetch(`${SHORTMAX_BASE}/api/v1/alleps/${encodeURIComponent(id)}?lang=id&code=${DRAMABUZZ_KEY}`, {
        next: { revalidate: 300 },
        signal: AbortSignal.timeout(4000),
      });
      if (res.ok) {
        const json = await res.json();
        const data = json?.data;
        if (data) {
          if (data.episodes) {
            episodeCache.set(`shortmax_${id}`, data.episodes);
          }
          const isDub = Boolean(
            data.name?.toLowerCase().includes('dubbing') ||
              data.name?.toLowerCase().includes('dijuluki') ||
              data.name?.toLowerCase().includes('sulih')
          );
          const drama: Drama = {
            id,
            bookId: String(data.code || id),
            title: data.name || cached?.title || `ShortMax Series #${id}`,
            cover: data.cover || cached?.cover || '',
            intro: data.summary || cached?.intro || '',
            tags: ['ShortMax', isDub ? 'Dubbing ID' : 'Sub Indo'],
            source: 'shortmax',
            totalEpisodes: data.totalEpisodes || data.episodes?.length || 50,
            isDubbed: isDub,
          };
          dramaDetailCache.set(`shortmax_${id}`, drama);
          return drama;
        }
      }
    } catch (err) {
      console.warn('[API] ShortMax detail error:', err);
    }
  }

  // 3. If NetShort, fetch drama info
  if (source === 'netshort') {
    try {
      const res = await fetch(`${NETSHORT_BASE}/api/drama/${encodeURIComponent(id)}?lang=in`, {
        headers: { 'x-token': DRAMABUZZ_KEY },
        next: { revalidate: 300 },
        signal: AbortSignal.timeout(4000),
      });
      if (res.ok) {
        const json = await res.json();
        const data = json?.data;
        if (data) {
          const drama: Drama = {
            id,
            bookId: id,
            title: data.shortPlayName || cached?.title || `NetShort #${id}`,
            cover: data.shortPlayCover || cached?.cover || '',
            intro: cached?.intro || 'Kisah cinta dan drama penuh konflik di setiap episodenya.',
            tags: ['NetShort', 'Drama'],
            source: 'netshort',
            totalEpisodes: data.totalEpisode || 50,
            isDubbed: true,
          };
          dramaDetailCache.set(`netshort_${id}`, drama);
          return drama;
        }
      }
    } catch (err) {
      console.warn('[API] NetShort detail error:', err);
    }
  }

  if (cached) return cached;

  const found = FALLBACK_DRAMAS.find((d) => d.id === id || d.bookId === id);
  if (found) return found;

  return {
    id,
    bookId: id,
    title: `Drama Populer #${id.slice(-4)}`,
    cover: 'https://images.unsplash.com/photo-1518709268805-4e9042af9f23?w=600&auto=format&fit=crop&q=80',
    hotCode: '500K+',
    tags: ['Populer', 'Drama'],
    source,
    totalEpisodes: 50,
    isDubbed: true,
    intro: 'Drama serial pendek dengan alur cerita menarik dan penuh intrik.',
  };
}

/**
 * Fetch episode video stream from real Dramabox / Shortmax CDNs
 */
export async function fetchDramaStream(
  source: DramaSource,
  dramaId: string,
  episode: number
): Promise<Episode> {
  // 1. DramaBox Stream: Direct MP4 via Akamai CDN
  if (source === 'dramabox') {
    try {
      let episodes = episodeCache.get(`dramabox_${dramaId}`);
      if (!episodes) {
        const res = await fetch(`${DRAMABOX_BASE}/api/dramabox/allepisode?bookId=${encodeURIComponent(dramaId)}`, {
          headers: { 'x-token': DRAMABUZZ_KEY },
          signal: AbortSignal.timeout(4500),
        });
        if (res.ok) {
          episodes = await res.json();
          if (Array.isArray(episodes)) {
            episodeCache.set(`dramabox_${dramaId}`, episodes);
          }
        }
      }

      if (Array.isArray(episodes) && episodes.length > 0) {
        const targetEp = episodes[episode - 1] || episodes[0];
        const streamUrl = targetEp.videoUrl720 || targetEp.videoUrl || targetEp.videoUrl540 || targetEp.videoUrl1080;
        if (streamUrl) {
          return {
            episodeNumber: episode,
            title: targetEp.chapterName || `Episode ${episode}`,
            videoUrl: streamUrl,
            qualities: [
              targetEp.videoUrl1080 ? { quality: '1080p', videoUrl: targetEp.videoUrl1080 } : null,
              targetEp.videoUrl720 ? { quality: '720p', videoUrl: targetEp.videoUrl720 } : null,
              targetEp.videoUrl540 ? { quality: '540p', videoUrl: targetEp.videoUrl540 } : null,
            ].filter(Boolean) as any[],
            subtitles: [{ language: 'id', label: 'Bahasa Indonesia (Dubbing)', url: '' }],
          };
        }
      }
    } catch (err) {
      console.warn(`[API] DramaBox stream error for ${dramaId} ep ${episode}:`, err);
    }
  }

  // 2. ShortMax Stream: HLS (.m3u8) via Akamai CDN
  if (source === 'shortmax') {
    try {
      let episodes = episodeCache.get(`shortmax_${dramaId}`);
      if (!episodes) {
        const res = await fetch(
          `${SHORTMAX_BASE}/api/v1/alleps/${encodeURIComponent(dramaId)}?lang=id&code=${DRAMABUZZ_KEY}`,
          { signal: AbortSignal.timeout(4500) }
        );
        if (res.ok) {
          const json = await res.json();
          episodes = json?.data?.episodes;
          if (Array.isArray(episodes)) {
            episodeCache.set(`shortmax_${dramaId}`, episodes);
          }
        }
      }

      if (Array.isArray(episodes) && episodes.length > 0) {
        const targetEp = episodes.find((e: any) => e.episode === episode) || episodes[0];
        const streamUrl =
          targetEp?.video?.video_720 ||
          targetEp?.video?.video_480 ||
          targetEp?.video?.video_1080;

        if (streamUrl) {
          return {
            episodeNumber: episode,
            title: `Episode ${episode}`,
            videoUrl: streamUrl,
            qualities: [
              targetEp.video.video_1080 ? { quality: '1080p', videoUrl: targetEp.video.video_1080 } : null,
              targetEp.video.video_720 ? { quality: '720p', videoUrl: targetEp.video.video_720 } : null,
              targetEp.video.video_480 ? { quality: '480p', videoUrl: targetEp.video.video_480 } : null,
            ].filter(Boolean) as any[],
            subtitles: [{ language: 'id', label: 'Bahasa Indonesia', url: '' }],
          };
        }
      }
    } catch (err) {
      console.warn(`[API] ShortMax stream error for ${dramaId} ep ${episode}:`, err);
    }
  }

  // 3. Fallback video
  const backupStreams = [
    'https://hwztakavideoto.dramaboxdb.com/4e02c3aa069bda473ef7f84a6353c030/6af73f41/19/6x3/63x4/634x2/63422000024/701367491_2/701367491.720p.narrowv3.mp4',
    'https://hwztakavideoto.dramaboxdb.com/2be57b13c5f795547796d545784021c8/6af73f41/69/8x7/87x2/872x2/87223000024/701844796_1/701844796.720p.wz.h264.mp4',
    'https://vjs.zencdn.net/v/oceans.mp4',
  ];
  const streamUrl = backupStreams[(episode - 1) % backupStreams.length];

  return {
    episodeNumber: episode,
    videoUrl: streamUrl,
    qualities: [
      { quality: '720p', videoUrl: streamUrl },
      { quality: '480p', videoUrl: streamUrl },
    ],
    subtitles: [{ language: 'id', label: 'Bahasa Indonesia', url: '' }],
  };
}

/**
 * Global Search across active platforms
 */
export async function searchDramas(query: string): Promise<Drama[]> {
  if (!query || !query.trim()) return [];
  const q = query.trim();

  const [smRes, dbRes] = await Promise.allSettled([
    fetch(`${SHORTMAX_BASE}/api/v1/search?q=${encodeURIComponent(q)}&lang=id&code=${DRAMABUZZ_KEY}`, {
      signal: AbortSignal.timeout(3500),
    }),
    fetch(`${DRAMABOX_BASE}/api/dramabox/search?query=${encodeURIComponent(q)}&lang=in`, {
      headers: { 'x-token': DRAMABUZZ_KEY },
      signal: AbortSignal.timeout(3500),
    }),
  ]);

  const smList: Drama[] = [];
  if (smRes.status === 'fulfilled' && smRes.value.ok) {
    try {
      const json = await smRes.value.json();
      const items = json?.data || [];
      if (Array.isArray(items)) {
        for (const item of items) smList.push(normalizeShortmaxItem(item));
      }
    } catch {}
  }

  const dbList: Drama[] = [];
  if (dbRes.status === 'fulfilled' && dbRes.value.ok) {
    try {
      const data = await dbRes.value.json();
      if (Array.isArray(data)) {
        for (const item of data) dbList.push(normalizeDramaboxItem(item));
      }
    } catch {}
  }

  return interleaveAndDedupe([dbList, smList]);
}

function normalizeDramaboxItem(item: any): Drama {
  const id = String(item.bookId || item.id || '');
  const title = (item.bookName || item.title || 'DramaBox Series').trim();
  const cover =
    item.coverWap ||
    item.cover ||
    'https://images.unsplash.com/photo-1518709268805-4e9042af9f23?w=600&auto=format&fit=crop&q=80';

  const isDub =
    title.toLowerCase().includes('sulih suara') ||
    title.toLowerCase().includes('dubbing') ||
    (Array.isArray(item.markNames) && item.markNames.includes('配音剧')) ||
    (Array.isArray(item.tags) && item.tags.some((t: string) => t.toLowerCase().includes('sulih') || t.toLowerCase().includes('dub')));

  return {
    id,
    bookId: id,
    title,
    bookName: title,
    cover,
    coverWap: cover,
    intro: item.introduction || item.intro || 'Drama pendek pilihan populer DramaBox.',
    hotCode: item.playCount || '1.2M',
    tags: item.tags || ['DramaBox', isDub ? 'Dub Indo' : 'Sub Indo'],
    source: 'dramabox',
    totalEpisodes: Number(item.chapterCount || 50),
    isDubbed: isDub,
  };
}

function normalizeShortmaxItem(item: any): Drama {
  const id = String(item.code || item.id || '');
  const title = (item.name || item.title || 'ShortMax Series').trim();
  const cover =
    item.cover ||
    'https://images.unsplash.com/photo-1518709268805-4e9042af9f23?w=600&auto=format&fit=crop&q=80';

  const lowerTitle = title.toLowerCase();
  const isDub =
    lowerTitle.includes('dubbing') ||
    lowerTitle.includes('dijuluki') ||
    lowerTitle.includes('sulih');

  return {
    id,
    bookId: id,
    title,
    bookName: title,
    cover,
    coverWap: cover,
    intro: item.summary || item.intro || 'Drama pendek pilihan populer ShortMax.',
    hotCode: item.views ? `${(item.views / 1000000).toFixed(1)}M` : '2.5M',
    tags: ['ShortMax', isDub ? 'Dub Indo' : 'Sub Indo'],
    source: 'shortmax',
    totalEpisodes: Number(item.episodes || 50),
    isDubbed: isDub,
  };
}

export const FALLBACK_DRAMAS: Drama[] = [
  {
    id: '42000022436',
    bookId: '42000022436',
    title: 'Tolak Aku, Raja Naga',
    bookName: 'Tolak Aku, Raja Naga',
    cover: 'https://hwztchapter.dramaboxdb.com/data/cppartner/4x2/42x0/420x0/42000022436/42000022436.jpg?t=1785209042338',
    horizontalCover: 'https://images.unsplash.com/photo-1518709268805-4e9042af9f23?w=1200&auto=format&fit=crop&q=80',
    hotCode: '4.8M',
    tags: ['Raja Naga', 'Romantis'],
    source: 'dramabox',
    totalEpisodes: 50,
    isDubbed: true,
    intro: 'Lyra, seorang manusia, tak sengaja bertemu Raja Naga, Kael dan menghabiskan malam penuh gairah dengannya. Namun Lyra menolak takdir pernikahan mereka demi melindungi rahasia terbesarnya.',
  },
  {
    id: '42000032278',
    bookId: '42000032278',
    title: 'Cinta Terlarang di Penjara Maut (Sulih Suara)',
    bookName: 'Cinta Terlarang di Penjara Maut (Sulih Suara)',
    cover: 'https://hwztchapter.dramaboxdb.com/data/cppartner/4x2/42x0/420x0/42000032278/42000032278.jpg?t=1793093823568',
    horizontalCover: 'https://images.unsplash.com/photo-1536440136628-849c177e76a1?w=1200&auto=format&fit=crop&q=80',
    hotCode: '4.1M',
    tags: ['Serangan Balik', 'Bertahan Hidup'],
    source: 'dramabox',
    totalEpisodes: 50,
    isDubbed: true,
    intro: 'Noah dijebak hingga dijebloskan ke Penjara Greystone, tempat ia harus bertahan hidup selama 72 jam untuk bebas. Dengan bantuan sistem misterius, dia membangkitkan kekuatan tertinggi.',
  },
  {
    id: '829641',
    bookId: '829641',
    title: '[Dubbing] Kesempatan Kedua',
    bookName: '[Dubbing] Kesempatan Kedua',
    cover: 'https://akamai-static.shorttv.live/images/cover/2025/11/07/853fb4b7ac4d453cb89eaaf2fe35d51d.jpg?auth_key=1782904166-0-0-cc25cb387faa7996322e1dd44d3393eb&process=mediagate',
    horizontalCover: 'https://images.unsplash.com/photo-1534447677768-be436bb09401?w=1200&auto=format&fit=crop&q=80',
    hotCode: '4.4M',
    tags: ['Reinkarnasi', 'Pembalasan'],
    source: 'shortmax',
    totalEpisodes: 57,
    isDubbed: true,
    intro: 'Dewi Maharni dibunuh oleh suaminya di hari jadi pernikahan mereka yang ke-10. Setelah Dewi reinkarnasi kembali, suami barunya baru sadar wanita yang ia cari sesungguhnya adalah Dewi.',
  },
];
