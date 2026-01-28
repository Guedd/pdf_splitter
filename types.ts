
export interface PdfSection {
  id: string;
  name: string;
  startPage: number;
  endPage: number;
}

export interface PdfMetadata {
  name: string;
  pageCount: number;
  size: number;
}

export enum AppStatus {
  IDLE = 'IDLE',
  LOADING_PDF = 'LOADING_PDF',
  READY = 'READY',
  PROCESSING = 'PROCESSING',
  ERROR = 'ERROR'
}
