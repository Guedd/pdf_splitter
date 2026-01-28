
import { PDFDocument } from 'pdf-lib';
import * as pdfjsLib from 'pdfjs-dist';
import JSZip from 'jszip';
import { PdfSection } from '../types';

// Initialize PDF.js worker
// Using a reliable CDN for the worker
pdfjsLib.GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.js`;

export const loadPdfDocument = async (file: File) => {
  const arrayBuffer = await file.arrayBuffer();
  const loadingTask = pdfjsLib.getDocument({ data: arrayBuffer });
  const pdf = await loadingTask.promise;
  return { pdf, arrayBuffer };
};

export const renderPageToCanvas = async (
  pdf: any,
  pageNumber: number,
  canvas: HTMLCanvasElement,
  scale: number = 1.5
) => {
  const page = await pdf.getPage(pageNumber);
  const viewport = page.getViewport({ scale });
  const context = canvas.getContext('2d');
  
  if (!context) return;

  canvas.height = viewport.height;
  canvas.width = viewport.width;

  const renderContext = {
    canvasContext: context,
    viewport: viewport,
  };
  
  await page.render(renderContext).promise;
};

export const splitAndZipPdf = async (
  originalArrayBuffer: ArrayBuffer,
  folderName: string,
  sections: PdfSection[]
): Promise<Blob> => {
  const zip = new JSZip();
  const pdfDoc = await PDFDocument.load(originalArrayBuffer);
  
  for (const section of sections) {
    const newPdf = await PDFDocument.create();
    
    // Pages in pdf-lib are 0-indexed, but our UI uses 1-indexed
    const pageIndices = [];
    for (let i = section.startPage - 1; i < section.endPage; i++) {
      pageIndices.push(i);
    }
    
    const copiedPages = await newPdf.copyPages(pdfDoc, pageIndices);
    copiedPages.forEach((page) => newPdf.addPage(page));
    
    const pdfBytes = await newPdf.save();
    const fileName = `${folderName}-${section.name}.pdf`.replace(/[/\\?%*:|"<>]/g, '-');
    zip.file(fileName, pdfBytes);
  }
  
  return await zip.generateAsync({ type: 'blob' });
};
