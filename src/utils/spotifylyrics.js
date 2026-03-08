import { parseSyncedLyrics } from './lrclib';

const PAXSENIX_API = 'https://lyrics.paxsenix.org';

/**
 * Parse the Spotify internal lyrics JSON format returned by the paxsenix proxy.
 * Handles both top-level `{ syncType, lines }` and wrapped `{ lyrics: { syncType, lines } }`.
 * Returns an array of { time: number (seconds), text: string } or null.
 */
function parseSpotifyLyricsJson(data) {
  if (!data) return null;

  // Unwrap nested `lyrics` key if present
  const root = data.lyrics ?? data;
  const lines = root.lines;

  if (!Array.isArray(lines) || lines.length === 0) return null;

  const result = lines
    .map((line) => ({
      time: (Number(line.startTimeMs) || 0) / 1000,
      text: (line.words ?? '').trim(),
    }))
    .filter((line) => line.text !== '' && line.text !== '♪');

  return result.length > 0 ? result : null;
}

/**
 * Fetch synced lyrics for a Spotify track directly by its Spotify track ID.
 * The paxsenix endpoint may return either a JSON object (Spotify's internal
 * lyrics format) or a plain LRC-formatted string — we handle both.
 *
 * Returns an array of { time: number (seconds), text: string } objects,
 * or null when lyrics are unavailable.
 */
export async function fetchSpotifyLyrics(trackId) {
  if (!trackId) return null;
  try {
    const params = new URLSearchParams({ id: trackId });
    const res = await fetch(`${PAXSENIX_API}/spotify/lyrics?${params}`);
    if (!res.ok) return null;

    const contentType = res.headers.get('content-type') ?? '';
    if (contentType.includes('application/json')) {
      const data = await res.json();
      return parseSpotifyLyricsJson(data);
    }

    // Fall back to plain LRC text
    const lrc = await res.text();
    // Try JSON parse in case content-type header is missing/wrong
    try {
      const data = JSON.parse(lrc);
      const jsonResult = parseSpotifyLyricsJson(data);
      if (jsonResult) return jsonResult;
    } catch {
      // Not JSON — proceed with LRC parsing
    }
    return parseSyncedLyrics(lrc);
  } catch {
    return null;
  }
}
