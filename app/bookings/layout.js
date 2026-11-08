import { NO_INDEX } from '@/lib/seo';

export const metadata = { title: 'My bookings', ...NO_INDEX };

export default function Layout({ children }) {
  return children;
}
