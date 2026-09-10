import { parseBuffer } from 'music-metadata'

/**
 * The server's own read of an uploaded audio file's duration — replaces trusting whatever the
 * client reported. Throws if the bytes don't actually decode as audio at all (wrong content, a
 * corrupt file, a non-audio file renamed to look like one) or if a real duration can't be
 * determined from them; a caller confirming a staged upload should treat either as "reject this
 * upload," not "fall back to some other number."
 */
export async function readAudioDuration(bytes: Buffer, contentType: string): Promise<number> {
  const metadata = await parseBuffer(bytes, contentType)
  if (metadata.format.duration === undefined) {
    throw new Error('audio file has no readable duration')
  }
  return metadata.format.duration
}
