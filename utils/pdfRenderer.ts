import * as pdfjsLib from 'pdfjs-dist';

// IMPORTANT: Configure worker for Vite environment
// We use a CDN to avoid complex build steps with workers.
// The main library is loaded via ESM (esm.sh), so it attempts to load the worker as a module.
// We must point to the .mjs version of the worker, otherwise the browser throws "Failed to fetch dynamically imported module".
const version = pdfjsLib.version || '5.4.624';
pdfjsLib.GlobalWorkerOptions.workerSrc = `https://unpkg.com/pdfjs-dist@${version}/build/pdf.worker.mjs`;

export const loadPDFDocument = async (data: ArrayBuffer) => {
  const loadingTask = pdfjsLib.getDocument({ data });
  return await loadingTask.promise;
};

export const renderPageToCanvas = async (
  pdfDoc: pdfjsLib.PDFDocumentProxy,
  pageNumber: number,
  canvas: HTMLCanvasElement,
  scale = 1
) => {
  const page = await pdfDoc.getPage(pageNumber);
  const viewport = page.getViewport({ scale });

  // Support high DPI screens
  const outputScale = window.devicePixelRatio || 1;

  canvas.width = Math.floor(viewport.width * outputScale);
  canvas.height = Math.floor(viewport.height * outputScale);
  canvas.style.width = Math.floor(viewport.width) + "px";
  canvas.style.height = Math.floor(viewport.height) + "px";

  const transform = outputScale !== 1
    ? [outputScale, 0, 0, outputScale, 0, 0]
    : undefined;

  const renderContext = {
    canvasContext: canvas.getContext('2d')!,
    transform: transform,
    viewport: viewport,
  };

  await page.render(renderContext).promise;
};

/**
 * Extracts text content from a page to send to the AI.
 * Limits text to the first 1000 characters to capture headers/titles while saving tokens.
 */
export const extractPageText = async (
  pdfDoc: pdfjsLib.PDFDocumentProxy,
  pageNumber: number
): Promise<string> => {
  try {
    const page = await pdfDoc.getPage(pageNumber);
    const textContent = await page.getTextContent();
    
    // Join items with space, limit length
    return textContent.items
      .map((item: any) => item.str)
      .join(' ')
      .slice(0, 1000); // 1000 char limit per page for context window efficiency
  } catch (error) {
    console.warn(`Failed to extract text from page ${pageNumber}`, error);
    return "";
  }
};