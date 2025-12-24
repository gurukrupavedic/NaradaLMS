'use client';

import React, { Suspense } from 'react';
import { Switch, Route } from 'wouter';
import { useAuth } from '@/features/shared-features/hooks/useAuth';
import { LoadingScreen } from '@/components/ui/loading-screen';
import { AppLayout } from './components/app-layout';

// Admin pages
import UserManagement from './admin/pages/UserManagement';
import AuditLogs from './admin/pages/AuditLogs';
import BatchManagement from './admin/pages/BatchManagement';
import BatchDetailAdmin from './admin/pages/BatchDetailAdmin';
import SystemSettings from './admin/pages/SystemSettings';

// Batch pages
import MyBatchesList from './batches/pages/MyBatchesList';
import BatchDetail from './batches/pages/BatchDetail';

// Learning & Content (placeholders for now)
const LearningPage = () => <div className="p-8"><h1 className="text-3xl font-bold">Learning Dashboard</h1></div>;
const CourseContentPage = () => <div className="p-8"><h1 className="text-3xl font-bold">Course Content</h1></div>;
const ContentPage = () => <div className="p-8"><h1 className="text-3xl font-bold">Content Studio</h1></div>;

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
          <Route path="/app" component={LearningPage} />
          <Route path="/app/learning" component={LearningPage} />
          <Route path="/app/learning/courses" component={CourseContentPage} />
          <Route path="/app/batches/:id" component={BatchDetail} />
          <Route path="/app/batches" component={MyBatchesList} />
          <Route path="/app/content" component={ContentPage} />
          <Route path="/app/admin" component={() => { window.location.href = '/app/admin/users'; return null; }} />
          <Route path="/app/admin/users" component={UserManagement} />
          <Route path="/app/admin/logs" component={AuditLogs} />
          <Route path="/app/admin/settings" component={SystemSettings} />
          <Route path="/app/admin/batches/:id" component={BatchDetailAdmin} />
          <Route path="/app/admin/batches" component={BatchManagement} />
          <Route component={() => <div className="p-8">Not Found</div>} />
        </Switch>
      </Suspense>
    </AppLayout>
  );
}
