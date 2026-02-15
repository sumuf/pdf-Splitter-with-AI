/**
 * Parses a range string (e.g., "1-3, 5, 8-10") into a sorted array of unique 0-based page indices.
 * @param input The range string input by the user
 * @param totalPages Total number of pages in the PDF (for validation)
 * @returns Array of 0-based page indices
 * @throws Error if invalid input
 */
export const parsePageRange = (input: string, totalPages: number): number[] => {
  if (!input.trim()) return [];

  const pages = new Set<number>();
  const parts = input.split(',');

  for (const part of parts) {
    const trimmed = part.trim();
    if (!trimmed) continue;

    if (trimmed.includes('-')) {
      const [startStr, endStr] = trimmed.split('-');
      const start = parseInt(startStr, 10);
      const end = parseInt(endStr, 10);

      if (isNaN(start) || isNaN(end)) {
        throw new Error(`Invalid range format: "${trimmed}"`);
      }

      // Validation logic
      if (start < 1 || end < 1) {
        throw new Error(`Page numbers must be positive: "${trimmed}"`);
      }
      if (start > totalPages || end > totalPages) {
        throw new Error(`Page range out of bounds (Max ${totalPages}): "${trimmed}"`);
      }
      if (start > end) {
        throw new Error(`Invalid range order (Start > End): "${trimmed}"`);
      }

      for (let i = start; i <= end; i++) {
        pages.add(i - 1); // Convert to 0-based
      }
    } else {
      const page = parseInt(trimmed, 10);
      if (isNaN(page)) {
        throw new Error(`Invalid page number: "${trimmed}"`);
      }
      if (page < 1) {
        throw new Error(`Page number must be positive: "${page}"`);
      }
      if (page > totalPages) {
        throw new Error(`Page number out of bounds (Max ${totalPages}): "${page}"`);
      }
      pages.add(page - 1); // Convert to 0-based
    }
  }

  return Array.from(pages).sort((a, b) => a - b);
};

export const validateGroups = (groups: { id: string, range: string }[], totalPages: number): { valid: boolean, error?: string, overlaps?: number[] } => {
  const pageMap = new Map<number, number>(); // PageIndex -> Count
  
  for (const group of groups) {
    try {
      const indices = parsePageRange(group.range, totalPages);
      indices.forEach(idx => {
        pageMap.set(idx, (pageMap.get(idx) || 0) + 1);
      });
    } catch (e: any) {
      return { valid: false, error: e.message };
    }
  }

  const overlaps: number[] = [];
  pageMap.forEach((count, idx) => {
    if (count > 1) overlaps.push(idx + 1); // Return 1-based for UI
  });

  if (overlaps.length > 0) {
    return { valid: false, error: `Overlapping pages detected: ${overlaps.join(', ')}`, overlaps };
  }

  return { valid: true };
};
