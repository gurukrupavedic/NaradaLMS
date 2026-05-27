import {
  DeleteObjectCommand,
  GetObjectCommand,
  HeadObjectCommand,
  ListObjectsV2Command,
  PutObjectCommand,
} from '@aws-sdk/client-s3'
import { getSignedUrl } from '@aws-sdk/s3-request-presigner'

import { env } from '@narada/env'
import { s3 } from './client'

const BUCKET = env.R2_BUCKET_NAME

const UPLOAD_EXPIRY_SECONDS = 60 * 15
const DOWNLOAD_EXPIRY_SECONDS = 60 * 60

export type ObjectSummary = {
  key: string
  lastModified: Date | null
}

export async function getUploadUrl(
  key: string,
  contentType: string,
  expiresIn = UPLOAD_EXPIRY_SECONDS,
) {
  const command = new PutObjectCommand({ Bucket: BUCKET, Key: key, ContentType: contentType })
  const uploadUrl = await getSignedUrl(s3, command, { expiresIn })
  return { uploadUrl }
}

export async function getDownloadUrl(key: string, expiresIn = DOWNLOAD_EXPIRY_SECONDS) {
  if (env.R2_PUBLIC_URL) {
    return `${env.R2_PUBLIC_URL}/${key}`
  }

  const command = new GetObjectCommand({ Bucket: BUCKET, Key: key })
  return getSignedUrl(s3, command, { expiresIn })
}

export async function putObject(key: string, body: Uint8Array, contentType: string) {
  await s3.send(
    new PutObjectCommand({ Bucket: BUCKET, Key: key, Body: body, ContentType: contentType }),
  )
}

export async function deleteObject(key: string) {
  await s3.send(new DeleteObjectCommand({ Bucket: env.R2_BUCKET_NAME, Key: key }))
}

export async function objectExists(key: string): Promise<boolean> {
  try {
    await s3.send(new HeadObjectCommand({ Bucket: BUCKET, Key: key }))
    return true
  } catch (error) {
    if (error instanceof Error && ['NotFound', 'NoSuchKey'].includes(error.name)) {
      return false
    }

    throw error
  }
}

export async function listObjectSummaries(prefix: string): Promise<ObjectSummary[]> {
  const objects: ObjectSummary[] = []
  let continuationToken: string | undefined
  do {
    const response = await s3.send(
      new ListObjectsV2Command({
        Bucket: BUCKET,
        Prefix: prefix,
        ContinuationToken: continuationToken,
      }),
    )

    for (const object of response.Contents ?? []) {
      if (object.Key) {
        objects.push({ key: object.Key, lastModified: object.LastModified ?? null })
      }
    }

    continuationToken = response.NextContinuationToken
  } while (continuationToken)

  return objects
}

export async function listObjectKeys(prefix: string): Promise<string[]> {
  const objects = await listObjectSummaries(prefix)
  return objects.map(object => object.key)
}
