// Is this password in a known data breach? (SEC-06; Supabase's own check
// needs a paid plan.) Uses the free Have I Been Pwned range API with
// k-anonymity: only the first 5 characters of the password's SHA-1 hash are
// sent, never the password or its full hash; the match is done here.
// If the service cannot be reached the answer is "not known", and sign-up
// goes on: a breach check must never stop real people from signing up.

export async function isPwnedPassword(password) {
  try {
    if (!password || typeof crypto === 'undefined' || !crypto.subtle) return false;
    const bytes = new TextEncoder().encode(password);
    const digest = await crypto.subtle.digest('SHA-1', bytes);
    const hex = [...new Uint8Array(digest)].map((b) => b.toString(16).padStart(2, '0')).join('').toUpperCase();
    const prefix = hex.slice(0, 5);
    const suffix = hex.slice(5);

    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), 4000);
    const res = await fetch(`https://api.pwnedpasswords.com/range/${prefix}`, {
      // padding hides how many results came back for this prefix
      headers: { 'Add-Padding': 'true' },
      signal: ctrl.signal,
    }).finally(() => clearTimeout(timer));
    if (!res.ok) return false;

    const text = await res.text();
    return text.split('\n').some((line) => {
      const [hash, count] = line.trim().split(':');
      return hash === suffix && Number(count) > 0;
    });
  } catch {
    return false;
  }
}
