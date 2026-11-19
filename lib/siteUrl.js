// The site's own address for links in emails and Telegram (SEC-18): fixed,
// never taken from the incoming request, so a preview URL or an odd Host
// header can never end up in a customer's inbox.
export const SITE_URL = (process.env.SITE_URL || 'https://www.mtani.ge').replace(/\/+$/, '');
