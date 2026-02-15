import React from 'react';
import * as pdfjsLib from 'pdfjs-dist';
import { Thumbnail } from './Thumbnail';

interface ThumbnailGridProps {
  pdfDoc: pdfjsLib.PDFDocumentProxy | null;
  pageCount: number;
  selectedPages: Set<number>;
  onTogglePage: (page: number) => void;
}

export const ThumbnailGrid: React.FC<ThumbnailGridProps> = ({ 
  pdfDoc, 
  pageCount, 
  selectedPages, 
  onTogglePage 
}) => {
  if (!pdfDoc) return null;

  return (
    <div className="bg-slate-50 border-t border-slate-200 p-6">
      <h2 className="text-lg font-semibold text-slate-800 mb-4">Preview & Selection</h2>
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
        {Array.from({ length: pageCount }, (_, i) => i + 1).map((pageNum) => (
          <Thumbnail
            key={pageNum}
            pdfDoc={pdfDoc}
            pageNumber={pageNum}
            isSelected={selectedPages.has(pageNum)}
            onToggle={onTogglePage}
          />
        ))}
      </div>
    </div>
  );
};
