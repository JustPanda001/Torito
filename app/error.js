'use client';

import NotFoundView from '@/components/NotFoundView';

export default function GlobalError({ reset }) {
  return <NotFoundView kind="error" onRetry={reset} />;
}
