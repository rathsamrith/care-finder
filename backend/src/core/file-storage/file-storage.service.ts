import { Injectable } from '@nestjs/common';
import { mkdir, rm, writeFile } from 'fs/promises';
import { join } from 'path';
import { randomUUID } from 'crypto';

export interface StoredFile {
  /** Path relative to STORAGE_ROOT, stored on the entity's row (e.g. hospitals.cover_image). */
  relativePath: string;
  /** Fully-qualified URL the frontend can load directly. */
  url: string;
}

// Single normalized convention - storage/uploads/{entity}/{id}/{filename} -
// replacing the Laravel app's ~6 different ad-hoc public/images/... path
// patterns (profiles/user-{first_name}/, hospital{id}/departments/
// department{id}/, hospital/hospital-{id}/, etc.)
@Injectable()
export class FileStorageService {
  private readonly root = process.env.STORAGE_ROOT ?? './storage/uploads';
  private readonly publicUrl = process.env.STORAGE_PUBLIC_URL ?? 'http://localhost:3001/uploads';

  async store(
    entity: string,
    entityId: string | number | bigint,
    originalFilename: string,
    buffer: Buffer,
  ): Promise<StoredFile> {
    const extension = originalFilename.includes('.')
      ? originalFilename.slice(originalFilename.lastIndexOf('.'))
      : '';
    const filename = `${randomUUID()}${extension}`;
    const dir = join(this.root, entity, String(entityId));
    await mkdir(dir, { recursive: true });
    await writeFile(join(dir, filename), buffer);

    const relativePath = `${entity}/${entityId}/${filename}`;
    return { relativePath, url: `${this.publicUrl}/${relativePath}` };
  }

  async deleteDirectory(entity: string, entityId: string | number | bigint): Promise<void> {
    const dir = join(this.root, entity, String(entityId));
    await rm(dir, { recursive: true, force: true });
  }

  // Every entity persists `store()`'s relativePath (not the full url) on
  // its row - response mappers call this to turn that back into something
  // the frontend can put straight into an <img src>.
  resolveUrl(relativePath: string | null | undefined): string | null {
    if (!relativePath) return null;
    if (relativePath.startsWith('http://') || relativePath.startsWith('https://')) {
      return relativePath;
    }
    return `${this.publicUrl}/${relativePath}`;
  }
}
