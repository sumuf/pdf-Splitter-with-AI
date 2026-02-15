import React, { useState, useEffect } from 'react';
import * as pdfjsLib from 'pdfjs-dist';
import { FileUpload } from './components/FileUpload';
import { ThumbnailGrid } from './components/ThumbnailGrid';
import { ProgressBar } from './components/ProgressBar';
import { GroupBuilder } from './components/GroupBuilder';
import { Button } from './components/ui/Button';
import { loadPDFDocument, extractPageText } from './utils/pdfRenderer';
import { splitByRange, splitEveryPage, splitByGroups } from './utils/pdfSplit';
import { downloadBlob, createZip } from './utils/download';
import { parsePageRange } from './utils/range';
import { generateChapterSuggestions } from './utils/ai';
import { PDFFile, ProcessingStatus, SplitMode, SplitGroup } from './types';
import { Scissors, Layers, Grid, FileStack } from 'lucide-react';

export default function App() {
  const [file, setFile] = useState<PDFFile | null>(null);
  const [pdfJsDoc, setPdfJsDoc] = useState<pdfjsLib.PDFDocumentProxy | null>(null);
  const [status, setStatus] = useState<ProcessingStatus>({ isProcessing: false, message: '', progress: 0 });
  const [mode, setMode] = useState<SplitMode>('range');
  
  // Split State
  const [rangeInput, setRangeInput] = useState('');
  const [groups, setGroups] = useState<SplitGroup[]>([]);
  const [allowOverlaps, setAllowOverlaps] = useState(false);
  const [selectedPages, setSelectedPages] = useState<Set<number>>(new Set());

  // Error clearing
  useEffect(() => {
    if (status.error) {
      const timer = setTimeout(() => setStatus(prev => ({ ...prev, error: undefined })), 5000);
      return () => clearTimeout(timer);
    }
  }, [status.error]);

  const handleFileSelect = async (rawFile: File) => {
    try {
      setStatus({ isProcessing: true, message: 'Loading PDF...', progress: 20 });
      const arrayBuffer = await rawFile.arrayBuffer();
      
      // Clone the buffer for PDF.js to avoid detachment issues if it transfers ownership to the worker
      const pdfJsBuffer = arrayBuffer.slice(0);
      const doc = await loadPDFDocument(pdfJsBuffer);
      setPdfJsDoc(doc);
      
      setFile({
        name: rawFile.name,
        size: rawFile.size,
        pageCount: doc.numPages,
        data: arrayBuffer // Keep the original buffer for pdf-lib operations
      });
      
      setStatus({ isProcessing: false, message: '', progress: 100 });
      setGroups([{ id: '1', name: 'Group 1', range: '' }]);
    } catch (err) {
      console.error(err);
      setStatus({ isProcessing: false, message: '', progress: 0, error: 'Failed to load PDF. It might be corrupted or password protected.' });
    }
  };

  const handleRemoveFile = () => {
    setFile(null);
    setPdfJsDoc(null);
    setSelectedPages(new Set());
    setRangeInput('');
    setGroups([]);
  };

  const togglePageSelection = (pageNum: number) => {
    const newSet = new Set(selectedPages);
    if (newSet.has(pageNum)) {
      newSet.delete(pageNum);
    } else {
      newSet.add(pageNum);
    }
    setSelectedPages(newSet);
  };

  const handleAIAutoSplit = async () => {
    if (!pdfJsDoc) return;
    
    // Safety check for API Key presence (client-side indication)
    if (!process.env.API_KEY) {
       setStatus({ 
        isProcessing: false, 
        message: '', 
        progress: 0, 
        error: 'AI features require an API Key configured in the environment.' 
      });
      return;
    }

    try {
      setStatus({ isProcessing: true, message: 'Extracting text for analysis...', progress: 10 });
      
      const pageTexts: { page: number; text: string }[] = [];
      const numPages = pdfJsDoc.numPages;
      
      // Extract text in chunks to show progress
      const batchSize = 10;
      for (let i = 1; i <= numPages; i += batchSize) {
        const batchPromises = [];
        for (let j = 0; j < batchSize && (i + j) <= numPages; j++) {
           batchPromises.push(extractPageText(pdfJsDoc, i + j));
        }
        
        const results = await Promise.all(batchPromises);
        results.forEach((text, index) => {
           // Only keep pages that have text content to reduce token usage
           if (text.trim().length > 0) {
             pageTexts.push({ page: i + index, text });
           }
        });
        
        // Update progress roughly from 10% to 50%
        const percent = 10 + Math.floor((i / numPages) * 40);
        setStatus(prev => ({ ...prev, progress: percent }));
      }

      setStatus({ isProcessing: true, message: 'AI is analyzing document structure...', progress: 60 });
      
      // Call Gemini
      const suggestedGroups = await generateChapterSuggestions(pageTexts);
      
      if (suggestedGroups.length > 0) {
        setGroups(suggestedGroups);
        setStatus({ isProcessing: false, message: 'AI Analysis Complete!', progress: 100 });
      } else {
         setStatus({ 
          isProcessing: false, 
          message: '', 
          progress: 0, 
          error: 'AI could not detect any clear chapter structure.' 
        });
      }

    } catch (err: any) {
      console.error(err);
      setStatus({ 
        isProcessing: false, 
        message: '', 
        progress: 0, 
        error: err.message || 'AI Analysis failed.' 
      });
    }
  };

  const executeSplit = async () => {
    if (!file) return;

    setStatus({ isProcessing: true, message: 'Starting split...', progress: 10 });

    try {
      const baseName = file.name.replace('.pdf', '');

      if (mode === 'range') {
        setStatus({ isProcessing: true, message: 'Processing pages...', progress: 40 });
        // Validation check
        try {
            parsePageRange(rangeInput, file.pageCount);
        } catch (e: any) {
            throw new Error(e.message);
        }

        const pdfBytes = await splitByRange(file.data, rangeInput, file.pageCount);
        setStatus({ isProcessing: true, message: 'Preparing download...', progress: 90 });
        const blob = new Blob([pdfBytes], { type: 'application/pdf' });
        downloadBlob(blob, `${baseName}_split.pdf`);

      } else if (mode === 'every') {
        setStatus({ isProcessing: true, message: 'Splitting every page...', progress: 30 });
        const files = await splitEveryPage(file.data);
        setStatus({ isProcessing: true, message: 'Zipping files...', progress: 80 });
        const zipBlob = await createZip(files);
        downloadBlob(zipBlob, `${baseName}_all_pages.zip`);

      } else if (mode === 'groups') {
        // Validation happens in component, but safety check here
        if (groups.length === 0) throw new Error("Please add at least one group.");
        
        setStatus({ isProcessing: true, message: 'Processing groups...', progress: 30 });
        const files = await splitByGroups(file.data, groups, file.pageCount);
        setStatus({ isProcessing: true, message: 'Zipping files...', progress: 80 });
        const zipBlob = await createZip(files);
        downloadBlob(zipBlob, `${baseName}_groups.zip`);
      }

      setStatus({ isProcessing: false, message: '', progress: 100 });
    } catch (err: any) {
      console.error(err);
      setStatus({ 
        isProcessing: false, 
        message: '', 
        progress: 0, 
        error: err.message || 'An error occurred during processing.' 
      });
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 font-sans text-slate-900 pb-20">
      <ProgressBar status={status} />
      
      {/* Header */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-30">
        <div className="max-w-5xl mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="bg-blue-600 p-1.5 rounded-lg">
               <Scissors className="text-white w-5 h-5" />
            </div>
            <h1 className="font-bold text-xl tracking-tight">PDF Splitter</h1>
          </div>
          <div className="text-sm text-slate-500 hidden sm:block">
            Secure • Client-side • Fast
          </div>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-4 py-8 space-y-8">
        
        {/* Upload Section */}
        <section>
          <FileUpload 
            onFileSelect={handleFileSelect} 
            currentFile={file}
            onClear={handleRemoveFile}
          />
        </section>

        {file && (
          <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
            
            {/* Split Mode Tabs */}
            <div className="flex border-b border-slate-200 overflow-x-auto">
              {[
                { id: 'range', label: 'Custom Range', icon: Layers },
                { id: 'every', label: 'Extract All Pages', icon: FileStack },
                { id: 'groups', label: 'Group Split', icon: Grid },
              ].map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setMode(tab.id as SplitMode)}
                  className={`
                    flex items-center gap-2 px-6 py-4 font-medium text-sm transition-colors whitespace-nowrap
                    ${mode === tab.id 
                      ? 'text-blue-600 border-b-2 border-blue-600 bg-blue-50/50' 
                      : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
                    }
                  `}
                >
                  <tab.icon className="w-4 h-4" />
                  {tab.label}
                </button>
              ))}
            </div>

            {/* Tab Content */}
            <div className="p-6">
              {mode === 'range' && (
                <div className="space-y-4 max-w-lg">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">
                      Pages to Extract
                    </label>
                    <div className="flex gap-2">
                      <input 
                        type="text" 
                        value={rangeInput}
                        onChange={(e) => setRangeInput(e.target.value)}
                        placeholder="e.g. 1-3, 5, 8-10"
                        className="flex-1 rounded-lg border border-slate-300 px-4 py-2 focus:ring-2 focus:ring-blue-500 focus:outline-none"
                      />
                      <Button onClick={() => setRangeInput(Array.from(selectedPages).sort((a: number, b: number) => a-b).join(', '))} disabled={selectedPages.size === 0} variant="secondary">
                        Use Selection
                      </Button>
                    </div>
                    <p className="text-xs text-slate-500 mt-2">
                      Tip: Select pages in the preview below to auto-fill this field.
                    </p>
                  </div>
                </div>
              )}

              {mode === 'every' && (
                <div className="text-slate-600">
                  <p>Every page in this PDF ({file.pageCount} pages) will be extracted as a separate file and downloaded as a ZIP archive.</p>
                </div>
              )}

              {mode === 'groups' && (
                <GroupBuilder 
                  groups={groups} 
                  setGroups={setGroups}
                  totalPages={file.pageCount}
                  selectedPages={selectedPages}
                  onClearSelection={() => setSelectedPages(new Set())}
                  allowOverlaps={allowOverlaps}
                  setAllowOverlaps={setAllowOverlaps}
                  onAutoGroup={handleAIAutoSplit}
                  isAnalyzing={status.isProcessing && status.message.includes('AI')}
                />
              )}

              <div className="mt-8 pt-6 border-t border-slate-100 flex justify-end">
                <Button 
                  size="lg" 
                  onClick={executeSplit}
                  disabled={mode === 'range' && !rangeInput}
                  className="shadow-lg shadow-blue-500/20"
                >
                  {mode === 'range' ? 'Download PDF' : 'Download ZIP'}
                </Button>
              </div>
            </div>

            {/* Preview Section */}
            <ThumbnailGrid 
              pdfDoc={pdfJsDoc}
              pageCount={file.pageCount}
              selectedPages={selectedPages}
              onTogglePage={togglePageSelection}
            />
          </div>
        )}
      </main>
    </div>
  );
}