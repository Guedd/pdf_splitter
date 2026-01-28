
import React, { useEffect, useRef, useState } from 'react';
import { renderPageToCanvas } from '../services/pdfService';

interface PdfPreviewProps {
  pdf: any;
  currentPage: number;
}

export const PdfPreview: React.FC<PdfPreviewProps> = ({ pdf, currentPage }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isRendering, setIsRendering] = useState(false);

  useEffect(() => {
    if (pdf && canvasRef.current) {
      setIsRendering(true);
      renderPageToCanvas(pdf, currentPage, canvasRef.current)
        .finally(() => setIsRendering(false));
    }
  }, [pdf, currentPage]);

  return (
    <div className="relative bg-white rounded-lg shadow-inner flex items-center justify-center p-4 min-h-[400px]">
      {isRendering && (
        <div className="absolute inset-0 flex items-center justify-center bg-white/50 z-10">
          <div className="animate-pulse text-gray-500 font-medium">Rendering Page {currentPage}...</div>
        </div>
      )}
      <canvas 
        ref={canvasRef} 
        className="pdf-viewer-canvas border border-gray-200"
      />
    </div>
  );
};
