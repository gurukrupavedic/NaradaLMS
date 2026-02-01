import fs from 'fs';
import path from 'path';
import { IStorageService } from './storage.interface';
import { config } from '../../config';

export class LocalStorageService implements IStorageService {
    private uploadDir: string;

    constructor() {
        this.uploadDir = path.join(process.cwd(), config.uploads.dir);
        this.ensureUploadDir();
    }

    private ensureUploadDir() {
        if (!fs.existsSync(this.uploadDir)) {
            fs.mkdirSync(this.uploadDir, { recursive: true });
        }
    }

    async uploadFile(fileBuffer: Buffer, filename: string): Promise<string> {
        const targetPath = path.join(this.uploadDir, filename);
        await fs.promises.writeFile(targetPath, fileBuffer);
        return `/uploads/${filename}`;
    }

    async deleteFile(relativePath: string): Promise<void> {
        // relativePath comes like "/uploads/file.mp3"
        // stripping "/uploads/" prefix if present
        const cleanPath = relativePath.replace(/^\/uploads\//, '');
        const targetPath = path.join(this.uploadDir, cleanPath);

        if (fs.existsSync(targetPath)) {
            await fs.promises.unlink(targetPath);
        }
    }

    getPublicUrl(filename: string): string {
        return `/uploads/${filename}`;
    }
}

export const storageService = new LocalStorageService();
