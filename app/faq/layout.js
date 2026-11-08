import { pageMetadata } from '@/lib/seo';

export const metadata = pageMetadata('FAQ', 'Answers to common questions about booking, gear, safety, weather and payments with MTANI.', '/faq');

export default function Layout({ children }) {
  return children;
}
