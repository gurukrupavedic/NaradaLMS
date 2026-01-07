'use client';

import React, { Suspense, useEffect } from 'react';
import { Switch, Route, useLocation } from 'wouter';
import { useAuth } from '@/features/shared-features/hooks/useAuth';
import { LoadingScreen } from '@/components/ui/loading-screen';
import { AppLayout } from './components/app-layout';

// Admin pages
import UserManagement from './admin/pages/UserManagement';
import AuditLogs from './admin/pages/AuditLogs';
import BatchManagement from './admin/pages/BatchManagement';
import SystemSettings from './admin/pages/SystemSettings';

// Batch pages (unified)
import MyBatchesList from './batches/pages/MyBatchesList';
import BatchDetails from './batches/pages/BatchDetails';

// Instructor pages
import { MyStudentsPage } from './instructor/pages/MyStudentsPage';
import { StudentDetailsPage } from './instructor/pages/StudentDetailsPage';

// Learning & Content
import { VedicLearningPage } from './student/pages/VedicLearningPage';
import { LearnChapterPage } from './student/pages/LearnChapterPage';

// Prototypes
import { TracksAndChaptersAccordion } from '@/temp-prototype/TracksAndChaptersAccordion';
import { TracksAndChaptersColumn } from '@/temp-prototype/TracksAndChaptersColumn';

// Content pages
import TracksAndChapters from './content/pages/TracksAndChaptersPage';
import ChapterContent from './content/pages/ChapterContentPage';
import { TracksAndChaptersRefined } from '@/temp-prototype/content-studio-refine/TracksAndChaptersRefined';

// Placeholder pages are scaffolded in new-ui/content/pages

export default function AppShell() {
  const { user } = useAuth();

  if (!user) {
    return <LoadingScreen message="Loading..." />;
  }

  // Get the primary role (first role in array)
  // Fallback to 'student' if no roles assigned
  const userRole = (user.roles && user.roles.length > 0) ? user.roles[0] : 'student';

  return (
    <AppLayout
      user={{
        name: `${user.firstName || ''} ${user.lastName || ''}`.trim() || 'User',
        email: user.email || '',
      }}
      userRole={userRole as any}
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
          <Route path="/app/admin" component={AdminRedirect} />
          <Route path="/app/admin/users" component={UserManagement} />
          <Route path="/app/admin/logs" component={AuditLogs} />
          <Route path="/app/admin/settings" component={SystemSettings} />
          <Route path="/app/admin/batches/:id" component={BatchDetails} />
          <Route path="/app/admin/batches" component={BatchManagement} />

          {/* Prototype Routes */}
          <Route path="/prototype/tracks-accordion" component={TracksAndChaptersAccordion} />
          <Route path="/prototype/tracks-column" component={TracksAndChaptersColumn} />
          <Route path="/prototype/content-studio-refine" component={TracksAndChaptersRefined} />

          <Route component={() => <div className="p-8">Not Found</div>} />
        </Switch>
      </Suspense>
    </AppLayout>
  );
}

function AdminRedirect() {
  const [, navigate] = useLocation();
  useEffect(() => {
    navigate('/app/admin/users');
  }, [navigate]);
  return null;
}
