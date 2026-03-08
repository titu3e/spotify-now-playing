import { useState } from 'react';
import { initiateSpotifyLogin, getClientId } from '../utils/spotify';
import './Setup.css';

export default function Setup() {
  const [clientId, setClientId] = useState(getClientId());
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleConnect(e) {
    e.preventDefault();
    const id = clientId.trim();
    if (!id) {
      setError('Please enter your Spotify Client ID');
      return;
    }
    if (!/^[a-f0-9]{32}$/.test(id)) {
      setError('Client ID should be a 32-character hexadecimal string');
      return;
    }
    setError('');
    setLoading(true);
    await initiateSpotifyLogin(id);
  }

  return (
    <div className="setup-container">
      <div className="setup-card">
        <div className="setup-logo">
          <svg viewBox="0 0 24 24" fill="currentColor" className="spotify-icon">
            <path d="M12 0C5.4 0 0 5.4 0 12s5.4 12 12 12 12-5.4 12-12S18.66 0 12 0zm5.521 17.34c-.24.359-.66.48-1.021.24-2.82-1.74-6.36-2.101-10.561-1.141-.418.122-.779-.179-.899-.539-.12-.421.18-.78.54-.9 4.56-1.021 8.52-.6 11.64 1.32.42.18.479.659.301 1.02zm1.44-3.3c-.301.42-.841.6-1.262.3-3.239-1.98-8.159-2.58-11.939-1.38-.479.12-1.02-.12-1.14-.6-.12-.48.12-1.021.6-1.141C9.6 9.9 15 10.561 18.72 12.84c.361.181.54.78.241 1.2zm.12-3.36C15.24 8.4 8.82 8.16 5.16 9.301c-.6.179-1.2-.181-1.38-.721-.18-.601.18-1.2.72-1.381 4.26-1.26 11.28-1.02 15.721 1.621.539.3.719 1.02.419 1.56-.299.421-1.02.599-1.559.3z" />
          </svg>
        </div>
        <h1 className="setup-title">Spotify Now Playing</h1>
        <p className="setup-subtitle">
          Connect your Spotify account to see what&apos;s playing with synced lyrics.
        </p>

        <div className="setup-instructions">
          <h3>How to get your Client ID</h3>
          <ol>
            <li>
              Go to{' '}
              <a
                href="https://developer.spotify.com/dashboard"
                target="_blank"
                rel="noreferrer"
              >
                Spotify Developer Dashboard
              </a>
            </li>
            <li>Create a new app (or use an existing one)</li>
            <li>
              Add <code>{window.location.origin + window.location.pathname}</code> as a
              Redirect URI in your app settings
            </li>
            <li>Copy the Client ID and paste it below</li>
          </ol>
        </div>

        <form className="setup-form" onSubmit={handleConnect}>
          <div className="input-group">
            <label htmlFor="clientId">Spotify Client ID</label>
            <input
              id="clientId"
              type="text"
              value={clientId}
              onChange={(e) => setClientId(e.target.value)}
              placeholder="Enter your 32-character Client ID"
              autoComplete="off"
              spellCheck={false}
            />
          </div>
          {error && <p className="setup-error">{error}</p>}
          <button type="submit" className="connect-btn" disabled={loading}>
            {loading ? 'Redirecting…' : 'Connect to Spotify'}
          </button>
        </form>
      </div>
    </div>
  );
}
