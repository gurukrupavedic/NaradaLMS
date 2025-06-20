/**
 * EXPERIMENT 1: Segment Mapping Grid Component
 * 
 * Extracted from ProgressiveMapper to handle segment display,
 * interaction, and mapping visualization.
 * 
 * Status: Experimental - Do not use in production
 * Created: January 2025
 * Purpose: Separate segment UI from audio controls
 */

import React from 'react';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Clock, Link2Off } from 'lucide-react';
import { TimestampPill } from './TimestampPill';
import { ConnectedCirclesIcon } from '@shared/components/experiment1/icons/ConnectedCirclesIcon';
import type { TextSegment, AudioMapping, Language, ContentMap } from '@shared/experiment1-types';
import { getSegmentText } from '@shared/experiment1-utils';

interface SegmentMappingGridProps {
  segments: TextSegment[];
  currentLanguage: Language;
  content: ContentMap;
  mappings: AudioMapping[];
  mappingSession: 'idle' | 'active' | 'paused';
  activeSegmentId: string | null;
  duration: number;
  onSegmentClick: (segmentId: string) => void;
  onPlaySegment: (mapping: AudioMapping, event: React.MouseEvent) => void;
  onMappingUpdate: (segmentId: string, mapping: Partial<AudioMapping>) => void;
  onMappingDelete: (segmentId: string) => void;
}

export const SegmentMappingGrid: React.FC<SegmentMappingGridProps> = ({
  segments,
  currentLanguage,
  content,
  mappings,
  mappingSession,
  activeSegmentId,
  duration,
  onSegmentClick,
  onPlaySegment,
  onMappingUpdate,
  onMappingDelete
}) => {
  const getSegmentMapping = (segmentId: string): AudioMapping | undefined => {
    return mappings.find(m => m.segmentId === segmentId);
  };

  const getSegmentStatus = (segmentId: string) => {
    if (activeSegmentId === segmentId) return 'active';
    if (getSegmentMapping(segmentId)) return 'completed';
    return 'inactive';
  };

  return (
    <Card className="h-full">
      <CardHeader>
        <CardTitle>Text Segments - Click When Heard</CardTitle>
      </CardHeader>
      <CardContent className="p-0 h-[calc(100vh-450px)] flex flex-col">
        <div className="flex-1 relative overflow-auto">
          <div className="px-6 py-4">
            <div className="space-y-3 min-w-[800px]">
              {segments.map((segment, index) => {
                const mapping = getSegmentMapping(segment.id);
                const status = getSegmentStatus(segment.id);
                const segmentText = getSegmentText(segment, content, currentLanguage);
                
                return (
                  <div key={segment.id} className="flex items-center gap-4 min-w-fit">
                    {/* Left: Timestamp pill */}
                    <div className="w-32 flex-shrink-0 flex items-center justify-start">
                      {mapping && status === 'completed' ? (
                        <TimestampPill
                          segmentId={segment.id}
                          startTime={mapping.startTime}
                          endTime={mapping.endTime}
                          onPlay={(start, end) => {
                            const fakeEvent = { stopPropagation: () => {} } as React.MouseEvent;
                            onPlaySegment(mapping, fakeEvent);
                          }}
                          onDelete={(segmentId) => onMappingDelete(segmentId)}
                          onTimestampUpdate={onMappingUpdate}
                          duration={duration}
                        />
                      ) : (
                        <div className="w-full h-8 rounded-lg bg-white border border-gray-200 shadow-sm"></div>
                      )}
                    </div>

                    {/* Right: Segment card */}
                    <div className="flex-1">
                      <div
                        onClick={() => onSegmentClick(segment.id)}
                        className={`border rounded-lg transition-all cursor-pointer ${
                          status === 'active' 
                            ? 'border-blue-500 bg-blue-50 shadow-md' 
                            : mappingSession === 'active'
                            ? 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                            : 'border-gray-200 bg-white hover:bg-gray-50'
                        }`}
                      >
                        <div className="flex items-start px-4 py-3">
                          {/* Left: Number and status */}
                          <div className="flex items-center gap-3 mr-4">
                            <Badge variant="secondary" className="text-xs px-2 py-0.5 min-w-6 justify-center">
                              {index + 1}
                            </Badge>
                            <div className="flex-shrink-0">
                              {status === 'active' ? (
                                <Badge variant="default" className="text-xs bg-blue-100 text-blue-700">
                                  <Clock className="h-3 w-3 mr-1 animate-strong-pulse" />
                                  Recording
                                </Badge>
                              ) : status === 'completed' ? (
                                <Badge variant="default" className="text-xs bg-green-100 text-green-700">
                                  <ConnectedCirclesIcon className="h-4 w-4 mr-1" />
                                  Mapped
                                </Badge>
                              ) : (
                                <Badge variant="outline" className="text-xs">
                                  <Link2Off className="h-3 w-3 mr-1" />
                                  Ready
                                </Badge>
                              )}
                            </div>
                          </div>
                          
                          {/* Right: Content */}
                          <div className="flex-1 min-w-0">
                            <div className="text-sm text-gray-700 leading-relaxed">
                              {segmentText}
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};