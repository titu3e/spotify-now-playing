import { useState, useEffect, useRef, useCallback } from 'react';
import { getCurrentlyPlaying, logout } from '../utils/spotify';
import { fetchLyrics, getActiveLyricIndex } from '../utils/lrclib';
import Lyrics from './Lyrics';
import './NowPlaying.css';

const POLL_INTERVAL = 3000;
const POSITION_SYNC_INTERVAL = 1000;

function formatTime(ms) {
  const total = Math.floor(ms / 1000);
  const min = Math.floor(total / 60);
  const sec = total % 60;
  return `${min}:${sec.toString().padStart(2, '0')}`;
}

export default function NowPlaying({ onLogout }) {
  const [track, setTrack] = useState(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [progressMs, setProgressMs] = useState(0);
  const [error, setError] = useState('');
  const [lyrics, setLyrics] = useState(null);
  const [isSynced, setIsSynced] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);
  const [bgColor, setBgColor] = useState('#121212');
  const [lyricsView, setLyricsView] = useState(false);

  const lastTrackId = useRef(null);
  const progressRef = useRef(0);
  const isPlayingRef = useRef(false);
  const positionTimerRef = useRef(null);
  const albumImgRef = useRef(null);

  // Extract dominant color from album art
  const extractColor = useCallback((imgUrl) => {
    if (!imgUrl) return;
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.src = imgUrl;
    img.onload = () => {
      const canvas = document.createElement('canvas');
      canvas.width = 4;
      canvas.height = 4;
      const ctx = canvas.getContext('2d');
      ctx.drawImage(img, 0, 0, 4, 4);
      const [r, g, b] = ctx.getImageData(0, 0, 1, 1).data;
      // Darken the color for the background
      const factor = 0.35;
      setBgColor(`rgb(${Math.floor(r * factor)},${Math.floor(g * factor)},${Math.floor(b * factor)})`);
    };
  }, []);

  // Smooth progress ticker
  const startProgressTicker = useCallback(() => {
    if (positionTimerRef.current) clearInterval(positionTimerRef.current);
    positionTimerRef.current = setInterval(() => {
      if (isPlayingRef.current) {
        progressRef.current += POSITION_SYNC_INTERVAL;
        setProgressMs(progressRef.current);
        // Update active lyric
        setActiveIndex((prev) => {
          const idx = getActiveLyricIndex(
            window.__currentLyrics,
            progressRef.current / 1000
          );
          return idx !== prev ? idx : prev;
        });
      }
    }, POSITION_SYNC_INTERVAL);
  }, []);

  // Fetch currently playing track
  const fetchTrack = useCallback(async () => {
    try {
      const data = await getCurrentlyPlaying();
      if (!data || !data.item) {
        setTrack(null);
        setIsPlaying(false);
        isPlayingRef.current = false;
        return;
      }

      const item = data.item;
      const playing = data.is_playing;

      setIsPlaying(playing);
      isPlayingRef.current = playing;
      progressRef.current = data.progress_ms;
      setProgressMs(data.progress_ms);

      // Track changed
      if (item.id !== lastTrackId.current) {
        lastTrackId.current = item.id;
        setTrack(item);
        setLyrics(null);
        setIsSynced(false);
        setActiveIndex(-1);
        window.__currentLyrics = null;

        extractColor(item.album?.images?.[0]?.url);

        // Fetch lyrics — use first artist only; lrclib matches against its own
        // artist_name field which typically contains the primary artist.
        const albumName = item.album?.name || '';
        const durationSec = item.duration_ms ? item.duration_ms / 1000 : undefined;
        const primaryArtist = item.artists?.[0]?.name || '';
        const artists = item.artists?.map((a) => a.name).join(', ') || '';

        const result = await fetchLyrics({
          artist: primaryArtist,
          title: item.name,
          album: albumName,
          duration: durationSec,
        });

        const synced = result ? result.every((l) => l.time !== null) : false;
        setIsSynced(synced);
        setLyrics(result);
        window.__currentLyrics = result;
      }
    } catch {
      setError('Failed to fetch playback data. Please try again.');
    }
  }, [extractColor]);

  useEffect(() => {
    fetchTrack();
    startProgressTicker();
    const pollTimer = setInterval(fetchTrack, POLL_INTERVAL);
    return () => {
      clearInterval(pollTimer);
      if (positionTimerRef.current) clearInterval(positionTimerRef.current);
    };
  }, [fetchTrack, startProgressTicker]);

  // Sync active lyric index on lyrics or progress change
  useEffect(() => {
    if (lyrics) {
      window.__currentLyrics = lyrics;
      const idx = getActiveLyricIndex(lyrics, progressMs / 1000);
      setActiveIndex(idx);
    }
  }, [lyrics, progressMs]);

  function handleLogout() {
    logout();
    onLogout();
  }

  if (error) {
    return (
      <div className="np-error">
        <p>{error}</p>
        <button onClick={() => { setError(''); fetchTrack(); }}>Retry</button>
        <button onClick={handleLogout}>Logout</button>
      </div>
    );
  }

  if (!track) {
    return (
      <div className="np-idle">
        <div className="np-idle-inner">
          <div className="np-idle-icon">
            <svg viewBox="0 0 24 24" fill="currentColor">
              <path d="M12 0C5.4 0 0 5.4 0 12s5.4 12 12 12 12-5.4 12-12S18.66 0 12 0zm5.521 17.34c-.24.359-.66.48-1.021.24-2.82-1.74-6.36-2.101-10.561-1.141-.418.122-.779-.179-.899-.539-.12-.421.18-.78.54-.9 4.56-1.021 8.52-.6 11.64 1.32.42.18.479.659.301 1.02zm1.44-3.3c-.301.42-.841.6-1.262.3-3.239-1.98-8.159-2.58-11.939-1.38-.479.12-1.02-.12-1.14-.6-.12-.48.12-1.021.6-1.141C9.6 9.9 15 10.561 18.72 12.84c.361.181.54.78.241 1.2zm.12-3.36C15.24 8.4 8.82 8.16 5.16 9.301c-.6.179-1.2-.181-1.38-.721-.18-.601.18-1.2.72-1.381 4.26-1.26 11.28-1.02 15.721 1.621.539.3.719 1.02.419 1.56-.299.421-1.02.599-1.559.3z" />
            </svg>
          </div>
          <p>Nothing playing right now</p>
          <span>Open Spotify and play something!</span>
          <button className="np-logout-btn" onClick={handleLogout}>Logout</button>
        </div>
      </div>
    );
  }

  const albumArt = track.album?.images?.[0]?.url;
  const artists = track.artists?.map((a) => a.name).join(', ') || 'Unknown Artist';
  const progress = Math.min(track.duration_ms ? progressMs / track.duration_ms : 0, 1);

  return (
    <div className="np-root" style={{ '--dynamic-bg': bgColor }}>
      <div className="np-bg-blur" style={{ backgroundImage: albumArt ? `url(${albumArt})` : 'none' }} />
      <div className="np-overlay" />

      <header className="np-header">
        <div className="np-header-logo">
          <svg viewBox="0 0 24 24" fill="currentColor" className="np-spotify-icon">
            <path d="M12 0C5.4 0 0 5.4 0 12s5.4 12 12 12 12-5.4 12-12S18.66 0 12 0zm5.521 17.34c-.24.359-.66.48-1.021.24-2.82-1.74-6.36-2.101-10.561-1.141-.418.122-.779-.179-.899-.539-.12-.421.18-.78.54-.9 4.56-1.021 8.52-.6 11.64 1.32.42.18.479.659.301 1.02zm1.44-3.3c-.301.42-.841.6-1.262.3-3.239-1.98-8.159-2.58-11.939-1.38-.479.12-1.02-.12-1.14-.6-.12-.48.12-1.021.6-1.141C9.6 9.9 15 10.561 18.72 12.84c.361.181.54.78.241 1.2zm.12-3.36C15.24 8.4 8.82 8.16 5.16 9.301c-.6.179-1.2-.181-1.38-.721-.18-.601.18-1.2.72-1.381 4.26-1.26 11.28-1.02 15.721 1.621.539.3.719 1.02.419 1.56-.299.421-1.02.599-1.559.3z" />
          </svg>
          <span>Now Playing</span>
        </div>
        <button className="np-logout-btn" onClick={handleLogout}>Logout</button>
      </header>

      <main className="np-main">
        <div className={`np-player-section ${lyricsView ? 'compact' : ''}`}>
          <div className="np-album-art-wrap">
            <img
              ref={albumImgRef}
              className={`np-album-art ${isPlaying ? 'playing' : ''}`}
              src={albumArt}
              alt={`${track.name} album art`}
            />
          </div>

          <div className="np-track-info">
            <h1 className="np-track-name">{track.name}</h1>
            <p className="np-artist-name">{artists}</p>
            <p className="np-album-name">{track.album?.name}</p>

            <div className="np-progress-section">
              <span className="np-time">{formatTime(progressMs)}</span>
              <div className="np-progress-bar">
                <div className="np-progress-fill" style={{ width: `${progress * 100}%` }} />
              </div>
              <span className="np-time">{formatTime(track.duration_ms)}</span>
            </div>

            <div className="np-status">
              {isPlaying ? (
                <div className="np-playing-badge">
                  <span className="np-bar" />
                  <span className="np-bar" />
                  <span className="np-bar" />
                  <span>Playing</span>
                </div>
              ) : (
                <div className="np-paused-badge">Paused</div>
              )}
            </div>
          </div>
        </div>

        {lyrics && (
          <div className="np-lyrics-section">
            <div className="np-lyrics-header">
              <h2>Lyrics</h2>
              <button
                className="np-lyrics-toggle"
                onClick={() => setLyricsView((v) => !v)}
              >
                {lyricsView ? 'Hide' : 'Show'}
              </button>
            </div>
            {lyricsView && (
              <div className="np-lyrics-container">
                <Lyrics
                  lines={lyrics}
                  activeIndex={activeIndex}
                  isSynced={isSynced}
                />
              </div>
            )}
          </div>
        )}

        {!lyricsView && lyrics && (
          <div className="np-lyrics-peek" onClick={() => setLyricsView(true)}>
            {lyrics[activeIndex]?.text || lyrics[Math.max(0, activeIndex)]?.text || 'View Lyrics'}
          </div>
        )}
      </main>
    </div>
  );
}
