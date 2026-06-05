/**
 * Injects a specific DPI value into a JPEG file's JFIF segment.
 * If JFIF APP0 is present, edits the DPI values at indices 13-17.
 * If not present, inserts an 18-byte JFIF APP0 segment right after SOI (FF D8).
 */
export function injectDpiToJpeg(arrayBuffer: ArrayBuffer, dpi: number): Blob {
  const bytes = new Uint8Array(arrayBuffer);
  
  // SOI must be at beginning (0xFF 0xD8)
  if (bytes[0] !== 0xFF || bytes[1] !== 0xD8) {
    return new Blob([bytes], { type: 'image/jpeg' }); // Not a JPEG or corrupt
  }
  
  const dpiX = Math.round(dpi);
  const dpiY = Math.round(dpi);
  
  // Try to find APP0 marker (0xFF, 0xE0) at index 2
  if (bytes[2] === 0xFF && bytes[3] === 0xE0) {
    // Check for "JFIF\0" identifier (offset 6-10)
    if (
      bytes[6] === 0x4A && // J
      bytes[7] === 0x46 && // F
      bytes[8] === 0x49 && // I
      bytes[9] === 0x46 && // F
      bytes[10] === 0x00   // \0
    ) {
      // Modify JFIF settings
      bytes[13] = 1; // Units = Dots per inch (1=inch, 2=cm)
      
      // X density (2 bytes)
      bytes[14] = (dpiX >> 8) & 0xFF;
      bytes[15] = dpiX & 0xFF;
      
      // Y density (2 bytes)
      bytes[16] = (dpiY >> 8) & 0xFF;
      bytes[17] = dpiY & 0xFF;
      
      return new Blob([bytes], { type: 'image/jpeg' });
    }
  }
  
  // If APP0 is not found, construct an APP0 JFIF segment and insert it
  // APP0 Segment Header (18 bytes):
  const app0 = new Uint8Array(18);
  app0[0] = 0xFF;
  app0[1] = 0xE0;
  app0[2] = 0x00;
  app0[3] = 0x10;
  app0[4] = 0x4A; // J
  app0[5] = 0x46; // F
  app0[6] = 0x49; // I
  app0[7] = 0x46; // F
  app0[8] = 0x00; // \0
  app0[9] = 0x01; // Version Major 1
  app0[10] = 0x02; // Version Minor 02
  app0[11] = 0x01; // Units = Dots per inch
  app0[12] = (dpiX >> 8) & 0xFF;
  app0[13] = dpiX & 0xFF;
  app0[14] = (dpiY >> 8) & 0xFF;
  app0[15] = dpiY & 0xFF;
  app0[16] = 0x00; // No Thumbnail
  app0[17] = 0x00;
  
  // Combine SOI (2 bytes) + APP0 (18 bytes) + rest of JPEG stream (from index 2)
  const outBytes = new Uint8Array(2 + 18 + (bytes.length - 2));
  outBytes.set(bytes.subarray(0, 2), 0);
  outBytes.set(app0, 2);
  outBytes.set(bytes.subarray(2), 20);
  
  return new Blob([outBytes], { type: 'image/jpeg' });
}

/**
 * Calculates resized dimensions based on target width/height or percentages
 */
export function calculateTargetSize(
  originalWidth: number,
  originalHeight: number,
  mode: 'percentage' | 'pixels' | 'physical',
  value: {
    percentage?: number;
    widthPx?: number;
    heightPx?: number;
    widthCm?: number;
    heightCm?: number;
    dpi?: number;
  },
  maintainAspectRatio: boolean = true
): { width: number; height: number } {
  let w = originalWidth;
  let h = originalHeight;
  const ratio = originalWidth / originalHeight;

  if (mode === 'percentage') {
    const p = (value.percentage || 100) / 100;
    w = Math.max(1, Math.round(originalWidth * p));
    h = Math.max(1, Math.round(originalHeight * p));
  } else if (mode === 'pixels') {
    const targetW = value.widthPx || originalWidth;
    const targetH = value.heightPx || originalHeight;

    if (maintainAspectRatio) {
      if (targetW !== originalWidth) {
        w = targetW;
        h = Math.max(1, Math.round(targetW / ratio));
      } else if (targetH !== originalHeight) {
        h = targetH;
        w = Math.max(1, Math.round(targetH * ratio));
      } else {
        w = targetW;
        h = targetH;
      }
    } else {
      w = targetW;
      h = targetH;
    }
  } else if (mode === 'physical') {
    // Physical sizing in cm with physical target DPI
    // pixels = (cm / 2.54) * DPI
    const dpi = value.dpi || 300;
    const cmW = value.widthCm || (originalWidth * 2.54) / 72;
    const cmH = value.heightCm || (originalHeight * 2.54) / 72;

    if (maintainAspectRatio) {
      // Calculate based on which side is explicitly modified or prioritize width
      const targetW = Math.max(1, Math.round((cmW / 2.54) * dpi));
      w = targetW;
      h = Math.max(1, Math.round(targetW / ratio));
    } else {
      w = Math.max(1, Math.round((cmW / 2.54) * dpi));
      h = Math.max(1, Math.round((cmH / 2.54) * dpi));
    }
  }

  return { width: w, height: h };
}

/**
 * Loads an image from Blob/File into HTMLImageElement
 */
export function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => resolve(img);
    img.onerror = (e) => reject(new Error('Failed to load image structure.'));
    img.src = src;
  });
}

/**
 * Resizes an image on a high-quality Canvas and returns a Blob
 */
export async function resizeImageCanvas(
  imageSourceUrl: string,
  targetWidth: number,
  targetHeight: number,
  format: string, // e.g. 'image/jpeg', 'image/png', 'image/webp'
  quality: number, // 0.1 to 1.0
  dpi: number
): Promise<Blob> {
  const img = await loadImage(imageSourceUrl);
  
  const canvas = document.createElement('canvas');
  canvas.width = targetWidth;
  canvas.height = targetHeight;
  
  const ctx = canvas.getContext('2d');
  if (!ctx) {
    throw new Error('Could not create canvas 2D rendering context.');
  }

  // Draw clean solid background for JPEG (which doesn't support alpha) to prevent black artifacts
  if (format === 'image/jpeg') {
    ctx.fillStyle = '#FFFFFF';
    ctx.fillRect(0, 0, targetWidth, targetHeight);
  } else {
    ctx.clearRect(0, 0, targetWidth, targetHeight);
  }

  // Draw image stretched to full canvas bounds
  ctx.drawImage(img, 0, 0, targetWidth, targetHeight);

  return new Promise((resolve, reject) => {
    canvas.toBlob(
      async (blob) => {
        if (!blob) {
          reject(new Error('Canvas compression outputted empty blob.'));
          return;
        }

        // If target output is JPEG, inject the requested DPI settings directly.
        if (format === 'image/jpeg') {
          try {
            const ab = await blob.arrayBuffer();
            const dpiBlob = injectDpiToJpeg(ab, dpi);
            resolve(dpiBlob);
          } catch (err) {
            // Fallback to original compression blob if metadata injection fails
            resolve(blob);
          }
        } else {
          resolve(blob);
        }
      },
      format,
      quality
    );
  });
}

/**
 * Utility to convert raw file sizes into readable visual strings
 */
export function formatBytes(bytes: number, decimals: number = 2): string {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
}
