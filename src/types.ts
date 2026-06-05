export type ResizeMode = 'percentage' | 'pixels' | 'physical';

export interface ImageResizeConfig {
  mode: ResizeMode;
  percentage: number;
  widthPx: number;
  heightPx: number;
  widthCm: number;
  heightCm: number;
  dpi: number;
  maintainAspectRatio: boolean;
  format: 'original' | 'image/jpeg' | 'image/png' | 'image/webp';
  quality: number; // 0.1 to 1.0
}

export type PDFResizeMode = 'scale' | 'preset';

export type PDFPresetType = 'A4' | 'Letter' | 'A3' | 'A5' | 'Legal';

export interface PDFResizeConfig {
  mode: PDFResizeMode;
  scale: number; // multiplier, e.g. 0.5, 0.75, 1.0, 1.25, 1.5
  preset: PDFPresetType;
  compressImages: boolean;
  quality: number; // 0.1 to 1.0 (for rendering/optimizing operations if we adjust image components)
}

export interface FileItem {
  id: string;
  file: File;
  name: string;
  type: 'image' | 'pdf';
  sizeBytes: number;
  originalWidth?: number;
  originalHeight?: number;
  aspectRatio?: number;
  srcUrl: string;
  originalDpi?: number;
  // Processing history or progress
  state: 'idle' | 'processing' | 'done' | 'error';
  errorMsg?: string;
  outputFile?: File;
  outputSizeBytes?: number;
  outputWidth?: number;
  outputHeight?: number;
}

export interface HistoryItem {
  id: string;
  name: string;
  type: 'image' | 'pdf';
  originalSize: number;
  newSize: number;
  savingsPercent: number;
  timestamp: number;
}
