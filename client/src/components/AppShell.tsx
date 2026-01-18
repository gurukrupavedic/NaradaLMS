'use client';

import React, { Suspense } from 'react';
import { Switch, Route } from 'wouter';
import { useAuth } from '@/features/shared/hooks/useAuth';
import { LoadingScreen } from '@/components/ui/loading-screen';
import { AppLayout } from '@/components/layout/app-layout';
import { SkipLink } from '@/components/ui/skip-link';

// Admin pages
import UserManagement from '@/features/admin/pages/UserManagement';
import AuditLogs from '@/features/admin/pages/AuditLogs';
import BatchManagement from '@/features/admin/pages/BatchManagement';
import SystemSettings from '@/features/admin/pages/SystemSettings';

// Batch pages (unified)
import MyBatchesList from '@/features/batches/pages/MyBatchesList';
import BatchDetails from '@/features/batches/pages/BatchDetails';

// Instructor pages
import { MyStudentsPage } from '@/features/instructor/pages/MyStudentsPage';
import { StudentDetailsPage } from '@/features/instructor/pages/StudentDetailsPage';

// Learning & Content
import { VedicLearningPage } from '@/features/student/pages/VedicLearningPage';
import { LearnChapterPage } from '@/features/student/pages/LearnChapterPage';

// Content pages
import TracksAndChapters from '@/features/content/pages/TracksAndChaptersPage';
import ChapterContent from '@/features/content/pages/ChapterContentPage';

export default function AppShell() {
  const { user } = useAuth();

  if (!user) {
    return <LoadingScreen message="Loading..." />;
  }

  // Get all user roles for multi-role support
  // Fallback to ['student'] if no roles assigned
  const userRoles = (user.roles && user.roles.length > 0) ? user.roles : ['student'];

  return (
    <>
      <SkipLink />
      <AppLayout
        user={{
          name: `${user.firstName || ''} ${user.lastName || ''}`.trim() || 'User',
          email: user.email || '',
        }}
        userRoles={userRoles as any}
      >

        <Suspense fallback={<LoadingScreen message="Loading..." />}>
          <Switch>
            <Route path="/app" component={VedicLearningPage} />
            <Route path="/app/learning" component={VedicLearningPage} />
            <Route path="/app/learning/chapter/:chapterId" component={LearnChapterPage} />
            <Route path="/app/instructor/students/:studentId" component={StudentDetailsPage} />
            <Route path="/app/instructor/students" component={MyStudentsPage} />
            <Route path="/app/instructor/batches/:id" component={BatchDetails} />
            <Route path="/app/instructor/batches" component={MyBatchesList} />
            <Route path="/app/content" component={TracksAndChapters} />
            <Route path="/app/content/tracks/:trackId/chapters/:chapterId" component={ChapterContent} />
            <Route path="/app/admin" component={() => { window.location.href = '/app/admin/users'; return null; }} />
            <Route path="/app/admin/users" component={UserManagement} />
            <Route path="/app/admin/logs" component={AuditLogs} />
            <Route path="/app/admin/settings" component={SystemSettings} />
            <Route path="/app/admin/batches/:id" component={BatchDetails} />
            <Route path="/app/admin/batches" component={BatchManagement} />


            <Route component={() => <div className="p-8">Not Found</div>} />
          </Switch>
        </Suspense>
      </AppLayout>
    </>
  );
}
