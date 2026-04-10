import * as pdfjsLib from 'pdfjs-dist';

// Use CDN worker to avoid bundling issues
pdfjsLib.GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.mjs`;

/**
 * Convert a PDF file to an array of JPEG base64 strings (one per page).
 * Renders at 1.0x scale with moderate quality — sufficient for AI text extraction
 * while keeping file size small and rendering fast on mobile.
 * @param onPageProgress optional callback reporting (currentPage, totalPages)
 */
export async function pdfToImages(
  file: File,
  maxPages = 20,
  onPageProgress?: (current: number, total: number) => void,
): Promise<{ base64: string; mimeType: string }[]> {
  const arrayBuffer = await file.arrayBuffer();
  const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
  const numPages = Math.min(pdf.numPages, maxPages);
  const results: { base64: string; mimeType: string }[] = [];

  for (let i = 1; i <= numPages; i++) {
    onPageProgress?.(i, numPages);
    const page = await pdf.getPage(i);
    const viewport = page.getViewport({ scale: 1.0 });

    const canvas = document.createElement('canvas');
    canvas.width = viewport.width;
    canvas.height = viewport.height;
    const ctx = canvas.getContext('2d')!;

    await page.render({ canvasContext: ctx, viewport, canvas } as never).promise;

    const dataUrl = canvas.toDataURL('image/jpeg', 0.6);
    const base64 = dataUrl.split(',')[1];
    results.push({ base64, mimeType: 'image/jpeg' });

    // Clean up canvas to free memory
    canvas.width = 0;
    canvas.height = 0;
  }

  return results;
}
