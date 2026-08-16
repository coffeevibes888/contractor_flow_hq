import Tesseract from 'tesseract.js';

export interface OCRResult {
  text: string;
  confidence: number;
}

export async function extractTextFromImage(imageUrl: string): Promise<OCRResult> {
  try {
    const result = await Tesseract.recognize(imageUrl, 'eng', {
      logger: (m) => console.log(m),
    });

    return {
      text: result.data.text,
      confidence: result.data.confidence,
    };
  } catch (error) {
    console.error('OCR extraction error:', error);
    throw new Error('Failed to extract text from image');
  }
}

export async function extractTextFromPDF(pdfUrl: string): Promise<OCRResult> {
  try {
    // For PDFs, we'd typically use pdf.js to convert pages to images first
    // Then run OCR on each page. This is a simplified version.
    const result = await Tesseract.recognize(pdfUrl, 'eng', {
      logger: (m) => console.log(m),
    });

    return {
      text: result.data.text,
      confidence: result.data.confidence,
    };
  } catch (error) {
    console.error('PDF OCR extraction error:', error);
    throw new Error('Failed to extract text from PDF');
  }
}

export function classifyDocumentType(text: string): string | null {
  const lowerText = text.toLowerCase();

  if (
    lowerText.includes('lease agreement') ||
    lowerText.includes('rental agreement')
  ) {
    return 'lease';
  }

  if (
    lowerText.includes('receipt') ||
    lowerText.includes('payment received')
  ) {
    return 'receipt';
  }

  if (
    lowerText.includes('rental application') ||
    lowerText.includes('tenant application')
  ) {
    return 'application';
  }

  if (
    lowerText.includes('notice') ||
    lowerText.includes('eviction')
  ) {
    return 'notice';
  }

  return null;
}
