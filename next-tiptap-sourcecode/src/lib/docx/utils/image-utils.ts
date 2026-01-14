export async function fetchImageData(src: string) {
  const response = await fetch(src);
  if (!response.ok) {
    throw new Error(`Failed to fetch image: ${response.statusText}`);
  }

  const arrayBuffer = await response.arrayBuffer();
  return new Uint8Array(arrayBuffer);
}

export function imageTypeFromData(imageData: Uint8Array<ArrayBuffer>) {
  // PNG: 89 50 4E 47
  if (
    imageData[0] === 0x89 &&
    imageData[1] === 0x50 &&
    imageData[2] === 0x4e &&
    imageData[3] === 0x47
  ) {
    return "png";
  }

  // JPEG: FF D8 FF
  if (imageData[0] === 0xff && imageData[1] === 0xd8 && imageData[2] === 0xff) {
    return "jpg";
  }

  // GIF: 47 49 46
  if (imageData[0] === 0x47 && imageData[1] === 0x49 && imageData[2] === 0x46) {
    return "gif";
  }

  // BMP: 42 4D
  if (imageData[0] === 0x42 && imageData[1] === 0x4d) {
    return "bmp";
  }

  // SVG check (text-based)
  const decoder = new TextDecoder();
  const header = decoder.decode(imageData.subarray(0, 200));
  if (header.includes("<svg")) {
    return "svg";
  }

  throw new Error("Unsupported image type");
}

export async function imageDimensionsFromData(
  imageData: Uint8Array<ArrayBuffer>
) {
  return new Promise<{ width: number; height: number }>((resolve, reject) => {
    const blob = new Blob([imageData]);
    const url = URL.createObjectURL(blob);
    const img = new Image();

    img.onload = () => {
      URL.revokeObjectURL(url);
      resolve({
        width: img.naturalWidth,
        height: img.naturalHeight,
      });
    };

    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error("Failed to load image dimensions"));
    };

    img.src = url;
  });
}

export async function fetchImageInfo(src: string) {
  const data = await fetchImageData(src);
  const type = imageTypeFromData(data);
  const dimensions = await imageDimensionsFromData(data);

  return { data, type, dimensions } as const;
}
