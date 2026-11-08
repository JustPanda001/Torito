import { pageMetadata } from '@/lib/seo';

export const metadata = pageMetadata('About us', 'MTANI is a Georgian outdoor travel team: ski instructors, mountain guides and local hosts for skiing, hiking, camping and climbing.', '/about');

export default function Layout({ children }) {
  return children;
}
