export interface IStorageService {
    /**
     * Upload a file to storage
     * @param fileBuffer - The file content
     * @param filename - Target filename
     * @param mimeType - File mime type
     * @returns Public URL or relative path to the file
     */
    uploadFile(fileBuffer: Buffer, filename: string, mimeType: string): Promise<string>;

    /**
     * Delete a file from storage
     * @param path - Path/Key of the file to delete
     */
    deleteFile(path: string): Promise<void>;

    /**
     * Get public URL for a file
     * @param path - Stored path
     */
    getPublicUrl(path: string): string;
}
