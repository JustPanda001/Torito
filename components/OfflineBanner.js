'use client';

// Tells the visitor when the site cannot reach its database. Without this a
// dead backend just reads "Failed to fetch", which means nothing to anyone.

import { useEffect, useState } from 'react';
import { SUPABASE_URL, SUPABASE_KEY } from '@/lib/supabaseClient';

export default function OfflineBanner() {
  const [offline, setOffline] = useState(false);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        // any HTTP reply means the host exists; fetch only rejects on DNS
        // failure or no network
        await fetch(`${SUPABASE_URL}/auth/v1/health`, {
          headers: { apikey: SUPABASE_KEY },
          cache: 'no-store',
        });
      } catch {
        if (alive) setOffline(true);
      }
    })();
    return () => { alive = false; };
  }, []);

  useEffect(() => {
    const show = offline && !dismissed;
    document.body.classList.toggle('has-offline-banner', show);
    return () => document.body.classList.remove('has-offline-banner');
  }, [offline, dismissed]);

  if (!offline || dismissed) return null;

  return (
    <div className="offline-banner" role="status">
      <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="1.9" aria-hidden="true">
        <path d="M12 9v4M12 17h.01" />
        <path d="M10.3 3.9 1.8 18a2 2 0 0 0 1.7 3h17a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0z" />
      </svg>
      <span>
        Not connected to the database. Signing in, creating an account and saving
        changes will not work — the trips shown are sample data.
      </span>
      <button type="button" className="offline-close" aria-label="Dismiss" onClick={() => setDismissed(true)}>×</button>
    </div>
  );
}
