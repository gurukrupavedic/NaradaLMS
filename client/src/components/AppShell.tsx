'use client';

import React, { Suspense } from 'react';
import { Switch, Route } from 'wouter';
import { useAuth } from '@/features/shared/hooks/useAuth';
import { LoadingScreen } from '@/components/ui/loading-screen';
import { AppLayout } from '@/components/layout/app-layout';
import { SkipLink } from '@/components/ui/skip-link';

// Admin pages
const UserManagementPage = React.lazy(() => import('@/features/admin/pages/UserManagementPage'));
const AuditLogsPage = React.lazy(() => import('@/features/admin/pages/AuditLogsPage'));
const BatchManagementPage = React.lazy(() => import('@/features/admin/pages/BatchManagementPage'));
const SystemSettingsPage = React.lazy(() => import('@/features/admin/pages/SystemSettingsPage'));

// Batch pages (unified)
const MyBatchesListPage = React.lazy(() => import('@/features/batches/pages/MyBatchesListPage'));
const BatchDetailsPage = React.lazy(() => import('@/features/batches/pages/BatchDetailsPage'));

// Instructor pages
const MyStudentsPage = React.lazy(() => import('@/features/instructor/pages/MyStudentsPage').then(module => ({ default: module.MyStudentsPage })));
const StudentDetailsPage = React.lazy(() => import('@/features/instructor/pages/StudentDetailsPage').then(module => ({ default: module.StudentDetailsPage })));

// Learning & Content
const VedicLearningPage = React.lazy(() => import('@/features/student/pages/VedicLearningPage').then(module => ({ default: module.VedicLearningPage })));
const LearnChapterPage = React.lazy(() => import('@/features/student/pages/LearnChapterPage').then(module => ({ default: module.LearnChapterPage })));

// Content pages
const TracksAndChapters = React.lazy(() => import('@/features/content/pages/TracksAndChaptersPage'));
const ChapterContent = React.lazy(() => import('@/features/content/pages/ChapterContentPage'));

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
            <Route path="/app/instructor/batches/:id" component={BatchDetailsPage} />
            <Route path="/app/instructor/batches" component={MyBatchesListPage} />
            <Route path="/app/content" component={TracksAndChapters} />
            <Route path="/app/content/tracks/:trackId/chapters/:chapterId" component={ChapterContent} />
            <Route path="/app/admin" component={() => { window.location.href = '/app/admin/users'; return null; }} />
            <Route path="/app/admin/users" component={UserManagementPage} />
            <Route path="/app/admin/logs" component={AuditLogsPage} />
            <Route path="/app/admin/settings" component={SystemSettingsPage} />
            <Route path="/app/admin/batches/:id" component={BatchDetailsPage} />
            <Route path="/app/admin/batches" component={BatchManagementPage} />


            <Route component={() => <div className="p-8">Not Found</div>} />
          </Switch>
        </Suspense>
      </AppLayout>
    </>
  );
}
