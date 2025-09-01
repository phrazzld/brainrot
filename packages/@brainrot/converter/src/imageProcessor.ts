/**
 * Image processing utility with Sharp.js primary and Jimp fallback
 */

export interface ImageMetadata {
  width: number;
  height: number;
  format: string;
  size: number;
}

export interface ImageProcessor {
  getMetadata(imagePath: string): Promise<ImageMetadata>;
  isAvailable(): boolean;
  getName(): string;
}

/**
 * Sharp.js-based image processor (preferred)
 */
class SharpProcessor implements ImageProcessor {
  private sharp: any;

  constructor(sharpInstance: any) {
    this.sharp = sharpInstance;
  }

  async getMetadata(imagePath: string): Promise<ImageMetadata> {
    const image = this.sharp(imagePath);
    const metadata = await image.metadata();
    const fs = await import('fs');
    const stats = await fs.promises.stat(imagePath);

    return {
      width: metadata.width || 0,
      height: metadata.height || 0,
      format: metadata.format || 'unknown',
      size: stats.size,
    };
  }

  isAvailable(): boolean {
    return !!this.sharp;
  }

  getName(): string {
    return 'Sharp.js';
  }
}

/**
 * Jimp-based image processor (fallback)
 */
class JimpProcessor implements ImageProcessor {
  private Jimp: any;

  constructor(JimpClass: any) {
    this.Jimp = JimpClass;
  }

  async getMetadata(imagePath: string): Promise<ImageMetadata> {
    const image = await this.Jimp.read(imagePath);
    const fs = await import('fs');
    const stats = await fs.promises.stat(imagePath);

    // Extract format from file extension as fallback
    const path = await import('path');
    const ext = path.extname(imagePath).toLowerCase().slice(1);
    
    return {
      width: image.bitmap.width,
      height: image.bitmap.height,
      format: image._originalMime?.split('/')?.[1] || ext || 'unknown',
      size: stats.size,
    };
  }

  isAvailable(): boolean {
    return !!this.Jimp;
  }

  getName(): string {
    return 'Jimp';
  }
}

/**
 * Create an image processor with Sharp.js preferred, Jimp fallback
 */
export async function createImageProcessor(): Promise<ImageProcessor> {
  // Try Sharp.js first
  try {
    const sharp = (await import('sharp')).default;
    return new SharpProcessor(sharp);
  } catch (sharpError) {
    console.warn('[IMAGE] Sharp.js not available, falling back to Jimp:', (sharpError as Error).message);
    
    // Try Jimp as fallback
    try {
      const Jimp = (await import('jimp')).default;
      return new JimpProcessor(Jimp);
    } catch (jimpError) {
      throw new Error(`No image processing library available. Sharp.js error: ${(sharpError as Error).message}. Jimp error: ${(jimpError as Error).message}`);
    }
  }
}

/**
 * Convenience function to get image metadata with automatic fallback
 */
export async function getImageMetadata(imagePath: string): Promise<ImageMetadata> {
  const processor = await createImageProcessor();
  return processor.getMetadata(imagePath);
}