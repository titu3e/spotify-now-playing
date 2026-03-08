import { useState, useEffect } from 'react';
import { isLoggedIn, exchangeCodeForToken } from './utils/spotify';
import Setup from './components/Setup';
import NowPlaying from './components/NowPlaying';

function App() {
  const [loggedIn, setLoggedIn] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function handleAuth() {
      const params = new URLSearchParams(window.location.search);
      const code = params.get('code');
      const error = params.get('error');

      if (error) {
        // User denied access
        window.history.replaceState({}, '', window.location.pathname);
        setLoading(false);
        return;
      }

      if (code) {
        try {
          await exchangeCodeForToken(code);
          setLoggedIn(true);
        } catch (err) {
          console.error('Token exchange failed:', err);
        }
        // Clean URL
        window.history.replaceState({}, '', window.location.pathname);
      } else {
        setLoggedIn(isLoggedIn());
      }

      setLoading(false);
    }

    handleAuth();
  }, []);

  function handleLogout() {
    setLoggedIn(false);
  }

  if (loading) {
    return (
      <div className="app-loading">
        <div className="app-loading-spinner" />
      </div>
    );
  }

  return loggedIn ? (
    <NowPlaying onLogout={handleLogout} />
  ) : (
    <Setup />
  );
}

export default App;
