import { PDFDocument } from 'pdf-lib';
import { parsePageRange } from './range';
import { SplitGroup } from '../types';

export const splitByRange = async (
  originalPdfBytes: ArrayBuffer,
  range: string,
  totalPageCount: number
): Promise<Uint8Array> => {
  const pageIndices = parsePageRange(range, totalPageCount);
  
  const srcDoc = await PDFDocument.load(originalPdfBytes);
  const newDoc = await PDFDocument.create();
  
  const copiedPages = await newDoc.copyPages(srcDoc, pageIndices);
  copiedPages.forEach(page => newDoc.addPage(page));
  
  return await newDoc.save();
};

export const splitEveryPage = async (
  originalPdfBytes: ArrayBuffer
): Promise<{ name: string; data: Uint8Array }[]> => {
  const srcDoc = await PDFDocument.load(originalPdfBytes);
  const pageCount = srcDoc.getPageCount();
  const results: { name: string; data: Uint8Array }[] = [];

  for (let i = 0; i < pageCount; i++) {
    const newDoc = await PDFDocument.create();
    const [copiedPage] = await newDoc.copyPages(srcDoc, [i]);
    newDoc.addPage(copiedPage);
    const data = await newDoc.save();
    results.push({
      name: `page_${i + 1}.pdf`,
      data
    });
  }
  return results;
};

export const splitByGroups = async (
  originalPdfBytes: ArrayBuffer,
  groups: SplitGroup[],
  totalPageCount: number
): Promise<{ name: string; data: Uint8Array }[]> => {
  const srcDoc = await PDFDocument.load(originalPdfBytes);
  const results: { name: string; data: Uint8Array }[] = [];

  for (const group of groups) {
    const pageIndices = parsePageRange(group.range, totalPageCount);
    if (pageIndices.length === 0) continue;

    const newDoc = await PDFDocument.create();
    const copiedPages = await newDoc.copyPages(srcDoc, pageIndices);
    copiedPages.forEach(page => newDoc.addPage(page));
    
    const data = await newDoc.save();
    const safeName = group.name.replace(/[^a-z0-9]/gi, '_').toLowerCase();
    results.push({
      name: `${safeName}_pages.pdf`,
      data
    });
  }
  return results;
};
