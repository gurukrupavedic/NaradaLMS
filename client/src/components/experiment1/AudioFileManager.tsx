/**
 * EXPERIMENT 1: Audio File Manager Component
 * 
 * Extracted from SegmentationStudio to handle file upload,
 * selection, and validation for audio files.
 * 
 * Status: Experimental - Do not use in production
 * Created: January 2025
 * Purpose: Separate audio file management from page logic
 */

import React from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Music, Upload, Trash2 } from 'lucide-react';
import type { AudioFile } from '@shared/experiment1-types';

interface AudioFileManagerProps {
  audioFiles: AudioFile[];
  selectedAudioFile: AudioFile | null;
  isUploading: boolean;
  onFileSelect: (file: AudioFile) => void;
  onFileUpload: (event: React.ChangeEvent<HTMLInputElement>) => void;
  onFileDelete?: (fileId: number) => void;
}

export const AudioFileManager: React.FC<AudioFileManagerProps> = ({
  audioFiles,
  selectedAudioFile,
  isUploading,
  onFileSelect,
  onFileUpload,
  onFileDelete
}) => {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Music className="h-5 w-5" />
          Audio Files
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Upload Section */}
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <Input
              type="file"
              accept="audio/*"
              onChange={onFileUpload}
              disabled={isUploading}
              className="flex-1"
            />
            <Button
              disabled={isUploading}
              size="sm"
              variant="outline"
            >
              <Upload className="h-4 w-4" />
            </Button>
          </div>
          <p className="text-xs text-gray-500">
            Upload MP3, WAV, M4A, or other audio formats
          </p>
        </div>

        {/* File List */}
        {audioFiles.length > 0 ? (
          <div className="space-y-2">
            <div className="text-sm font-medium">Available Files:</div>
            {audioFiles.map((file) => (
              <div
                key={file.id}
                className={`flex items-center justify-between p-3 border rounded-lg cursor-pointer transition-colors ${
                  selectedAudioFile?.id === file.id
                    ? 'border-blue-500 bg-blue-50'
                    : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                }`}
                onClick={() => onFileSelect(file)}
              >
                <div className="flex items-center gap-3">
                  <Music className="h-4 w-4 text-gray-400" />
                  <div>
                    <div className="text-sm font-medium">
                      {file.displayName || file.filename}
                    </div>
                    <div className="text-xs text-gray-500">
                      {file.filename}
                    </div>
                  </div>
                </div>
                
                <div className="flex items-center gap-2">
                  {selectedAudioFile?.id === file.id && (
                    <Badge variant="default" className="text-xs">
                      Selected
                    </Badge>
                  )}
                  
                  {onFileDelete && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={(e) => {
                        e.stopPropagation();
                        onFileDelete(file.id);
                      }}
                      className="h-6 w-6 p-0 text-gray-400 hover:text-red-600"
                    >
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  )}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-8 text-gray-500">
            <Music className="h-8 w-8 mx-auto mb-2 text-gray-300" />
            <p className="text-sm">No audio files uploaded</p>
            <p className="text-xs">Upload an audio file to begin mapping</p>
          </div>
        )}

        {/* Status */}
        {isUploading && (
          <div className="text-sm text-blue-600">
            Uploading audio file...
          </div>
        )}
      </CardContent>
    </Card>
  );
};