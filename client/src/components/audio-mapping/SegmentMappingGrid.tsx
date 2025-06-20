/**
 * Segment Mapping Grid - Production Component
 * 
 * Displays text segments for audio mapping with visual feedback
 * Handles segment interaction and mapping visualization
 * 
 * Status: Production Ready
 * Migrated: January 2025
 */

import React from 'react';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Clock, Link2Off } from 'lucide-react';
import { TimestampPill } from './TimestampPill';

// Local types and utilities
type Language = 'te' | 'hi' | 'en';

interface TextSegment {
  id: string;
  conceptualName: string;
  textReferences: {
    te?: { start: number; end: number };
    hi?: { start: number; end: number };
    en?: { start: number; end: number };
  };
  order: number;
}

interface AudioMapping {
  segmentId: string;
  startTime: number;
  endTime: number;
}

interface ContentMap {
  te?: string;
  hi?: string;
  en?: string;
}

// Local utility functions
const getSegmentText = (
  segment: TextSegment,
  content: ContentMap,
  language: Language,
  truncate: boolean = false,
  maxLength: number = 50
): string => {
  const range = segment.textReferences[language];
  const text = content[language] || '';
  
  if (!range || !text) {
    return segment.conceptualName;
  }
  
  const segmentText = text.slice(range.start, range.end);
  
  if (truncate && segmentText.length > maxLength) {
    return segmentText.slice(0, maxLength) + '...';
  }
  
  return segmentText;
};

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
                          duration={duration}
                          onPlay={(e) => onPlaySegment(mapping, e)}
                          onUpdate={onMappingUpdate}
                          onDelete={() => onMappingDelete(segment.id)}
                        />
                      ) : (
                        <div className="flex items-center text-gray-400">
                          <Clock className="w-4 h-4 mr-1" />
                          <span className="text-sm">--:--</span>
                        </div>
                      )}
                    </div>

                    {/* Center: Segment content with click handler */}
                    <div 
                      className={`flex-1 min-w-0 p-4 rounded-lg border-2 transition-all duration-200 cursor-pointer ${
                        status === 'active'
                          ? 'border-blue-500 bg-blue-50 shadow-md transform scale-[1.02]'
                          : status === 'completed'
                          ? 'border-green-300 bg-green-50 hover:bg-green-100'
                          : mappingSession === 'active'
                          ? 'border-gray-300 bg-white hover:border-blue-300 hover:bg-blue-25'
                          : 'border-gray-200 bg-gray-50'
                      } ${mappingSession !== 'active' && status === 'inactive' ? 'cursor-not-allowed opacity-60' : ''}`}
                      onClick={() => {
                        if (mappingSession === 'active') {
                          onSegmentClick(segment.id);
                        }
                      }}
                    >
                      <div className="flex items-start justify-between">
                        <div className="min-w-0 flex-1">
                          <div className="font-medium text-gray-900 mb-1 truncate">
                            {segment.conceptualName}
                          </div>
                          <div className="text-sm text-gray-600 leading-relaxed">
                            {segmentText}
                          </div>
                        </div>
                        
                        {/* Right: Status indicator */}
                        <div className="ml-3 flex-shrink-0">
                          {status === 'active' && (
                            <Badge variant="default" className="bg-blue-500">
                              Active
                            </Badge>
                          )}
                          {status === 'completed' && (
                            <Badge variant="secondary" className="bg-green-500 text-white">
                              Mapped
                            </Badge>
                          )}
                          {status === 'inactive' && mappingSession === 'active' && (
                            <Badge variant="outline">
                              Click when heard
                            </Badge>
                          )}
                          {status === 'inactive' && mappingSession !== 'active' && (
                            <div className="flex items-center text-gray-400">
                              <Link2Off className="w-4 h-4" />
                            </div>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Right: Order number */}
                    <div className="w-8 flex-shrink-0 text-center">
                      <span className="text-xs text-gray-500">#{index + 1}</span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Footer with instructions */}
        <div className="flex-shrink-0 border-t bg-gray-50 px-6 py-3">
          <div className="text-xs text-gray-600 text-center">
            {mappingSession === 'active' 
              ? 'Listen to the audio and click on segments when you hear them'
              : mappingSession === 'paused'
              ? 'Session paused - resume to continue mapping'
              : 'Start a mapping session to begin audio-text alignment'
            }
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default SegmentMappingGrid;