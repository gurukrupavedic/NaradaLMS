export interface AudioFile {
	id: number;
	chapterId: number;
	filename: string;
	displayName: string;
	reciter?: string | null;
	duration?: number | null;
	fileSize?: number | null;
	mimeType?: string | null;
	uploadedBy: string;
	createdAt?: Date | null;
}

export interface MediaSegment {
	id: number;
	audioFileId: number;
	startMs: number;
	endMs: number;
	segmentName?: string | null;
	createdBy: string;
	createdAt?: Date | null;
}

export interface MappingWithTimestamps {
	mappingId: number;
	textSegmentId: number;
	mediaSegmentId: number;
	audioFileId: number;
	startMs: number;
	endMs: number;
	segmentName?: string | null;
}

export interface CreateAudioFileData {
	chapterId: number;
	filename: string;
	displayName: string;
	fileSize?: number;
	duration?: number;
	mimeType?: string;
	uploadedBy: string;
	reciter?: string | null;
}

export interface CreateMediaSegmentData {
	audioFileId: number;
	startMs: number;
	endMs: number;
	segmentName?: string | null;
	createdBy: string;
}

export interface CreateMappingData {
	audioFileId: number;
	textSegmentId: number;
	startMs: number;
	endMs: number;
	createdBy: string;
}
