import * as pdfjsLib from 'pdfjs-dist';

// Use CDN worker to avoid bundling issues
pdfjsLib.GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.mjs`;

/**
 * Convert a PDF file to an array of JPEG base64 strings (one per page).
 * Renders each page at 1.5x scale for good quality while keeping size reasonable.
 */
export async function pdfToImages(file: File, maxPages = 5): Promise<{ base64: string; mimeType: string }[]> {
  const arrayBuffer = await file.arrayBuffer();
  const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
  const numPages = Math.min(pdf.numPages, maxPages);
  const results: { base64: string; mimeType: string }[] = [];

  for (let i = 1; i <= numPages; i++) {
    const page = await pdf.getPage(i);
    const viewport = page.getViewport({ scale: 1.5 });

    const canvas = document.createElement('canvas');
    canvas.width = viewport.width;
    canvas.height = viewport.height;
    const ctx = canvas.getContext('2d')!;

    await page.render({ canvasContext: ctx, viewport, canvas } as never).promise;

    // Convert to JPEG base64 (smaller than PNG)
    const dataUrl = canvas.toDataURL('image/jpeg', 0.85);
    const base64 = dataUrl.split(',')[1];
    results.push({ base64, mimeType: 'image/jpeg' });
  }

  return results;
}
