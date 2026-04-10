import * as pdfjsLib from 'pdfjs-dist';

// Use CDN worker to avoid bundling issues
pdfjsLib.GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.mjs`;

/**
 * Convert a PDF file to an array of JPEG base64 strings.
 * Skips first page (cover) and last page (back cover) for brochures.
 * Uses lower scale and quality to keep payload small for API calls.
 * If content pages exceed maxImages, evenly samples across them.
 */
export async function pdfToImages(file: File, maxImages = 5): Promise<{ base64: string; mimeType: string }[]> {
  const arrayBuffer = await file.arrayBuffer();
  const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
  const totalPages = pdf.numPages;

  // Determine content pages: skip first and last page if PDF has 4+ pages
  const startPage = totalPages >= 4 ? 2 : 1;
  const endPage = totalPages >= 4 ? totalPages - 1 : totalPages;
  const contentPageCount = endPage - startPage + 1;

  // Pick which pages to render (evenly spaced if too many)
  let pageNumbers: number[];
  if (contentPageCount <= maxImages) {
    pageNumbers = Array.from({ length: contentPageCount }, (_, i) => startPage + i);
  } else {
    pageNumbers = Array.from({ length: maxImages }, (_, i) =>
      startPage + Math.round(i * (contentPageCount - 1) / (maxImages - 1))
    );
  }

  const results: { base64: string; mimeType: string }[] = [];

  for (const pageNum of pageNumbers) {
    const page = await pdf.getPage(pageNum);
    const viewport = page.getViewport({ scale: 1.0 });

    const canvas = document.createElement('canvas');
    canvas.width = viewport.width;
    canvas.height = viewport.height;
    const ctx = canvas.getContext('2d')!;

    await page.render({ canvasContext: ctx, viewport, canvas } as never).promise;

    const dataUrl = canvas.toDataURL('image/jpeg', 0.5);
    const base64 = dataUrl.split(',')[1];
    results.push({ base64, mimeType: 'image/jpeg' });

    // Clean up canvas to free memory
    canvas.width = 0;
    canvas.height = 0;
  }

  return results;
}
