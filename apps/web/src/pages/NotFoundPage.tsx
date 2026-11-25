import * as React from 'react';
import { Link } from 'react-router-dom';
import { PageHeader } from '@/components/ui/page-header';
import { Button } from '@/components/ui/button';
import { EmptyState } from '@/components/ui/feedback';

export function NotFoundPage() {
  return (
    <div className="space-y-5">
      <PageHeader title="Page not found" subtitle="The page you are looking for does not exist." />
      <EmptyState
        title="404 — Page not found"
        description="Check the URL or return to the dashboard."
        action={
          <Button asChild>
            <Link to="/">Go to dashboard</Link>
          </Button>
        }
      />
    </div>
  );
}
export default NotFoundPage;
