import { getDownloadUrl } from '@narada/storage'

export async function resolveDownloadUrl(objectKey: string): Promise<string> {
  return getDownloadUrl(objectKey)
}
