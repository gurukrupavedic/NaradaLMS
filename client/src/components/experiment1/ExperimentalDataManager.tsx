/**
 * EXPERIMENT 1: Experimental Data Manager Component
 * 
 * Extracted from SegmentationStudio to handle segment and mapping state,
 * import/export functionality, and data persistence.
 * 
 * Status: Experimental - Do not use in production
 * Created: January 2025
 * Purpose: Separate data management from page orchestration
 */

import React from 'react';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Download, Upload, Trash2, AlertCircle } from 'lucide-react';
import type { TextSegment, AudioMapping } from '@shared/experiment1-types';

interface ExperimentalDataManagerProps {
  segments: TextSegment[];
  mappings: AudioMapping[];
  hasUnsavedChanges: boolean;
  onExportToProduction: () => void;
  onImportFromProduction: () => void;
  onClearExperiment: () => void;
}

export const ExperimentalDataManager: React.FC<ExperimentalDataManagerProps> = ({
  segments,
  mappings,
  hasUnsavedChanges,
  onExportToProduction,
  onImportFromProduction,
  onClearExperiment
}) => {
  const segmentCount = segments.length;
  const mappingCount = mappings.length;
  const mappedSegmentCount = segments.filter(s => mappings.some(m => m.segmentId === s.id)).length;
  const completionPercentage = segmentCount > 0 ? Math.round((mappedSegmentCount / segmentCount) * 100) : 0;

  return (
    <div className="space-y-4">
      {/* Experiment Status */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white p-3 rounded-lg border">
          <div className="text-sm text-gray-500">Segments</div>
          <div className="text-lg font-semibold">{segmentCount}</div>
        </div>
        <div className="bg-white p-3 rounded-lg border">
          <div className="text-sm text-gray-500">Mappings</div>
          <div className="text-lg font-semibold">{mappingCount}</div>
        </div>
        <div className="bg-white p-3 rounded-lg border">
          <div className="text-sm text-gray-500">Mapped</div>
          <div className="text-lg font-semibold">{mappedSegmentCount}/{segmentCount}</div>
        </div>
        <div className="bg-white p-3 rounded-lg border">
          <div className="text-sm text-gray-500">Complete</div>
          <div className="text-lg font-semibold">{completionPercentage}%</div>
        </div>
      </div>

      {/* Unsaved Changes Warning */}
      {hasUnsavedChanges && (
        <Alert>
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            You have unsaved experimental changes. Export to production or they will be lost.
          </AlertDescription>
        </Alert>
      )}

      {/* Data Management Actions */}
      <div className="flex flex-wrap gap-2">
        <Button 
          onClick={onExportToProduction}
          disabled={segmentCount === 0}
          size="sm"
        >
          <Download className="h-4 w-4 mr-2" />
          Export to Production
        </Button>
        
        <Button 
          onClick={onImportFromProduction}
          variant="outline"
          size="sm"
        >
          <Upload className="h-4 w-4 mr-2" />
          Import from Production
        </Button>
        
        <Button 
          onClick={onClearExperiment}
          variant="outline"
          size="sm"
          disabled={segmentCount === 0 && mappingCount === 0}
        >
          <Trash2 className="h-4 w-4 mr-2" />
          Clear Experiment
        </Button>
      </div>

      {/* Progress Summary */}
      {segmentCount > 0 && (
        <div className="text-sm text-gray-600">
          Experiment contains {segmentCount} text segments with {mappingCount} audio mappings. 
          {completionPercentage === 100 ? (
            <span className="text-green-600 font-medium"> All segments are mapped!</span>
          ) : (
            <span> {segmentCount - mappedSegmentCount} segments need mapping.</span>
          )}
        </div>
      )}
    </div>
  );
};