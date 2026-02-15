import React, { useRef, useState } from 'react';
import { Upload, FileText, X } from 'lucide-react';
import { Button } from './ui/Button';
import { PDFFile } from '../types';

interface FileUploadProps {
  onFileSelect: (file: File) => void;
  currentFile: PDFFile | null;
  onClear: () => void;
}

export const FileUpload: React.FC<FileUploadProps> = ({ onFileSelect, currentFile, onClear }) => {
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      const file = e.dataTransfer.files[0];
      if (file.type === 'application/pdf') {
        onFileSelect(file);
      } else {
        alert('Please select a PDF file.');
      }
    }
  };

  if (currentFile) {
    return (
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className="p-3 bg-blue-50 rounded-lg">
            <FileText className="w-8 h-8 text-blue-600" />
          </div>
          <div>
            <h3 className="font-medium text-slate-900">{currentFile.name}</h3>
            <p className="text-sm text-slate-500">
              {(currentFile.size / 1024 / 1024).toFixed(2)} MB • {currentFile.pageCount} pages
            </p>
          </div>
        </div>
        <Button variant="secondary" onClick={onClear} className="gap-2">
          <X className="w-4 h-4" /> Remove
        </Button>
      </div>
    );
  }

  return (
    <div
      onClick={() => fileInputRef.current?.click()}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      className={`
        border-2 border-dashed rounded-xl p-12 text-center cursor-pointer transition-all duration-200
        ${isDragging 
          ? 'border-blue-500 bg-blue-50' 
          : 'border-slate-300 hover:border-slate-400 hover:bg-slate-50'
        }
      `}
    >
      <input
        type="file"
        ref={fileInputRef}
        onChange={(e) => {
          if (e.target.files?.[0]) onFileSelect(e.target.files[0]);
        }}
        accept="application/pdf"
        className="hidden"
      />
      <div className="flex flex-col items-center gap-4">
        <div className="p-4 bg-blue-100 rounded-full">
          <Upload className="w-8 h-8 text-blue-600" />
        </div>
        <div>
          <h3 className="text-lg font-semibold text-slate-900">Drop PDF here</h3>
          <p className="text-slate-500 mt-1">or click to browse</p>
        </div>
      </div>
    </div>
  );
};
