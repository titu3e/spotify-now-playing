const PAXSENIX_API = 'https://lyrics.paxsenix.org';

/**
 * Search Apple Music for songs matching the given query string.
 * Returns an array of result objects (id, songName, artistName, albumName, artwork, …)
 * or an empty array on failure.
 */
export async function searchAppleMusic(query) {
  try {
    const params = new URLSearchParams({ q: query });
    const res = await fetch(`${PAXSENIX_API}/apple-music/search?${params}`);
    if (!res.ok) return [];
    const data = await res.json();
    return Array.isArray(data) ? data : [];
  } catch {
    return [];
  }
}

/**
 * Fetch Apple Music syllable / synced lyrics for the given track ID.
 * Returns an array of line objects:
 *   { time: number (seconds), endtime: number, text: string, words: [{text, time, endtime}] }
 * or null when lyrics are unavailable.
 */
export async function fetchAppleMusicLyrics(id) {
  try {
    const params = new URLSearchParams({ id, ttml: 'false' });
    const res = await fetch(`${PAXSENIX_API}/apple-music/lyrics?${params}`);
    if (!res.ok) return null;
    const data = await res.json();
    return parseAppleMusicLyrics(data);
  } catch {
    return null;
  }
}

/** Convert the paxsenix lyrics response into our internal line array. */
function parseAppleMusicLyrics(data) {
  if (!data || !Array.isArray(data.content) || data.content.length === 0) return null;

  return data.content.map((line) => {
    const words = Array.isArray(line.text)
      ? line.text.map((w) => ({
          text: w.text,
          time: w.timestamp / 1000,
          endtime: w.endtime / 1000,
        }))
      : [];
    const text = words.map((w) => w.text).join(' ');
    return {
      time: line.timestamp / 1000,
      endtime: line.endtime / 1000,
      text,
      words,
    };
  });
}

/**
 * Pick the best result from an Apple Music search for a given artist + title.
 * Returns the best matching result object, or the first result when no close
 * match is found, or null when results is empty.
 */
export function findBestMatch(results, { artist, title }) {
  if (!results || results.length === 0) return null;

  const normalize = (s) =>
    decodeHtmlEntities(String(s))
      .toLowerCase()
      .replace(/[^a-z0-9\s]/g, '')
      .trim();

  const normTitle = normalize(title);
  const normArtist = normalize(artist);

  // 1. Exact title + artist match
  const exact = results.find((r) => {
    const rTitle  = normalize(r.songName);
    const rArtist = normalize(r.artistName);
    return rTitle === normTitle && rArtist.includes(normArtist);
  });
  if (exact) return exact;

  // 2. Exact title match only
  const titleOnly = results.find((r) => normalize(r.songName) === normTitle);
  if (titleOnly) return titleOnly;

  // 3. First result
  return results[0];
}

/**
 * Decode common HTML entities returned by the Apple Music API (e.g. &amp; → &).
 * Uses a single-pass replace to avoid double-decoding issues.
 */
export function decodeHtmlEntities(str) {
  const map = { '&amp;': '&', '&lt;': '<', '&gt;': '>' };
  return String(str).replace(/&amp;|&lt;|&gt;/g, (m) => map[m]);
}

/**
 * Given a line's words array and the current playback position (seconds),
 * return the index of the currently highlighted word.
 */
export function getActiveWordIndex(words, positionSec) {
  if (!words || words.length === 0) return -1;
  let active = -1;
  for (let i = 0; i < words.length; i++) {
    if (words[i].time <= positionSec) {
      active = i;
    } else {
      break;
    }
  }
  return active;
}

/**
 * Resolve the Apple Music artwork URL template to a concrete URL.
 * The API returns a template like  ".../image/{w}x{h}bb.{f}"
 * which we replace with a fixed 80×80 JPEG.
 */
export function resolveArtworkUrl(template, size = 80) {
  if (!template) return null;
  return template
    .replace('{w}', String(size))
    .replace('{h}', String(size))
    .replace('{f}', 'jpg');
}
