export interface PDFFile {
  name: string;
  size: number;
  pageCount: number;
  data: ArrayBuffer;
}

export interface SplitGroup {
  id: string;
  name: string;
  range: string;
}

export type SplitMode = 'range' | 'every' | 'groups';

export interface ProcessingStatus {
  isProcessing: boolean;
  message: string;
  progress: number; // 0 to 100
  error?: string;
}
