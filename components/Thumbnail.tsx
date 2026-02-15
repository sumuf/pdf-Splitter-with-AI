import React, { useEffect, useRef, useState } from 'react';
import * as pdfjsLib from 'pdfjs-dist';
import { renderPageToCanvas } from '../utils/pdfRenderer';

interface ThumbnailProps {
  pdfDoc: pdfjsLib.PDFDocumentProxy;
  pageNumber: number;
  isSelected: boolean;
  onToggle: (page: number) => void;
}

export const Thumbnail: React.FC<ThumbnailProps> = ({ pdfDoc, pageNumber, isSelected, onToggle }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [rendered, setRendered] = useState(false);
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsVisible(true);
          observer.disconnect();
        }
      },
      { rootMargin: '100px' }
    );

    if (containerRef.current) {
      observer.observe(containerRef.current);
    }

    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    if (isVisible && !rendered && canvasRef.current) {
      renderPageToCanvas(pdfDoc, pageNumber, canvasRef.current, 0.3)
        .then(() => setRendered(true))
        .catch(err => console.error(`Error rendering page ${pageNumber}`, err));
    }
  }, [isVisible, rendered, pdfDoc, pageNumber]);

  return (
    <div 
      ref={containerRef}
      onClick={() => onToggle(pageNumber)}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          onToggle(pageNumber);
        }
      }}
      tabIndex={0}
      className={`
        relative group cursor-pointer rounded-lg overflow-hidden border-2 transition-all
        ${isSelected ? 'border-blue-500 ring-2 ring-blue-200' : 'border-slate-200 hover:border-blue-300'}
      `}
    >
      <div className="aspect-[1/1.4] bg-slate-100 flex items-center justify-center">
        {!rendered && (
          <div className="text-slate-400 text-xs">Loading...</div>
        )}
        <canvas ref={canvasRef} className={`w-full h-full object-contain ${!rendered ? 'hidden' : ''}`} />
      </div>
      
      {/* Overlay for page number */}
      <div className={`
        absolute top-2 left-2 px-2 py-0.5 rounded text-xs font-medium z-10
        ${isSelected ? 'bg-blue-600 text-white' : 'bg-black/50 text-white'}
      `}>
        Page {pageNumber}
      </div>

      {/* Selection Checkmark */}
      <div className={`
        absolute inset-0 bg-blue-500/10 flex items-center justify-center transition-opacity
        ${isSelected ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'}
      `}>
        {isSelected && (
          <div className="bg-blue-600 text-white p-2 rounded-full shadow-lg">
             <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
               <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
             </svg>
          </div>
        )}
      </div>
    </div>
  );
};
