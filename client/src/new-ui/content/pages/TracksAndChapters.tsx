'use client';

import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

export default function TracksAndChapters() {
  // TODO: Implement in Phase 5.2 - port from temp-prototype/TracksAndChaptersColumn.tsx
  return (
    <div className="p-6">
      <Card>
        <CardHeader>
          <CardTitle>Tracks & Chapters</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground">Content Studio - Coming in Phase 5.2</p>
        </CardContent>
      </Card>
    </div>
  );
}
