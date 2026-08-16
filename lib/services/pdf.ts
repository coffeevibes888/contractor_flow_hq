import chromium from '@sparticuz/chromium-min';
import puppeteer, { Browser } from 'puppeteer-core';

let browserInstance: Browser | null = null;
const isLocal = process.env.NODE_ENV === 'development';

// Remote chromium binary URL - updated to latest working version
// See: https://github.com/Sparticuz/chromium/releases
const CHROMIUM_REMOTE_URL = 'https://github.com/Sparticuz/chromium/releases/download/v131.0.1/chromium-v131.0.1-pack.tar';

async function getBrowser(): Promise<Browser> {
  if (browserInstance && browserInstance.isConnected()) {
    return browserInstance;
  }

  try {
    if (isLocal) {
      // For local development, use installed Chrome
      browserInstance = await puppeteer.launch({
        channel: 'chrome',
        headless: true,
      }) as Browser;
    } else {
      // For Vercel/production, download chromium at runtime
      console.log('PDF - Downloading chromium binary from:', CHROMIUM_REMOTE_URL);
      
      const executablePath = await chromium.executablePath(CHROMIUM_REMOTE_URL);
      console.log('PDF - Executable path:', executablePath);
      
      browserInstance = await puppeteer.launch({
        args: [
          ...chromium.args,
          '--no-sandbox',
          '--disable-setuid-sandbox',
          '--disable-dev-shm-usage',
          '--disable-gpu',
          '--single-process',
        ],
        executablePath,
        headless: true,
      }) as Browser;
      console.log('PDF - Browser launched successfully');
    }

    return browserInstance;
  } catch (error: any) {
    console.error('Failed to launch browser:', error);
    console.error('Error details:', error.message, error.stack);
    throw new Error('PDF generation service unavailable. Please try again later.');
  }
}

export async function htmlToPdfBuffer(html: string): Promise<Buffer> {
  console.log('PDF generation - Starting...');
  const browser = await getBrowser();
  console.log('PDF generation - Browser launched');

  const page = await browser.newPage();
  console.log('PDF generation - New page created');

  try {
    await page.setViewport({ width: 850, height: 1100 });
    await page.emulateMediaType('print');
    await page.setContent(html, { waitUntil: 'networkidle0', timeout: 30000 });
    console.log('PDF generation - Content set');

    // Wait for all images to load (including base64 data URLs)
    await page.evaluate(async () => {
      const images = Array.from(document.querySelectorAll('img'));
      await Promise.all(
        images.map((img) => {
          if (img.complete) return Promise.resolve();
          return new Promise((resolve) => {
            img.onload = resolve;
            img.onerror = resolve;
          });
        })
      );
    });
    console.log('PDF generation - Images loaded');

    const pdf = await page.pdf({
      format: 'A4',
      printBackground: true,
      margin: { top: '20mm', bottom: '20mm', left: '15mm', right: '15mm' },
    });
    console.log('PDF generation - PDF created, size:', pdf.length, 'bytes');

    return Buffer.from(pdf);
  } catch (error: any) {
    console.error('PDF generation error:', error);
    throw new Error('Failed to generate PDF document.');
  } finally {
    await page.close();
    // Always close browser in serverless to avoid memory issues
    if (browserInstance) {
      await browserInstance.close();
      browserInstance = null;
    }
  }
}
