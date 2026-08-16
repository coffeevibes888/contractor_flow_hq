import Tesseract, { createWorker } from 'tesseract.js';

export interface OCRResult {
  text: string;
  confidence: number;
}

export interface IDData {
  fullName?: string;
  dateOfBirth?: string;
  idNumber?: string;
  expirationDate?: string;
  issuingState?: string;
  address?: string;
  confidence: number;
}

export interface PayStubData {
  employerName?: string;
  employeeName?: string;
  payPeriodStart?: string;
  payPeriodEnd?: string;
  grossPay?: number;
  netPay?: number;
  yearToDateGross?: number;
  confidence: number;
}

export interface BankStatementData {
  accountHolderName?: string;
  statementPeriodStart?: string;
  statementPeriodEnd?: string;
  deposits: Array<{ date: string; amount: number }>;
  totalDeposits: number;
  confidence: number;
}

export class OCRService {
  private static workerPool: Tesseract.Worker[] = [];
  private static readonly POOL_SIZE = 2;
  private static isInitialized = false;

  /**
   * Initialize worker pool
   */
  private static async initializeWorkerPool(): Promise<void> {
    if (this.isInitialized) return;

    for (let i = 0; i < this.POOL_SIZE; i++) {
      const worker = await createWorker('eng');
      this.workerPool.push(worker);
    }

    this.isInitialized = true;
  }

  /**
   * Get available worker from pool
   */
  private static async getWorker(): Promise<Tesseract.Worker> {
    await this.initializeWorkerPool();
    
    // Simple round-robin selection
    const worker = this.workerPool.shift();
    if (worker) {
      this.workerPool.push(worker);
      return worker;
    }
    
    // Fallback: create new worker if pool is empty
    return await createWorker('eng');
  }

  /**
   * Extract text from image/PDF
   */
  static async extractText(imageUrl: string): Promise<OCRResult> {
    try {
      const worker = await this.getWorker();
      const result = await worker.recognize(imageUrl);
      
      return {
        text: result.data.text,
        confidence: result.data.confidence,
      };
    } catch (error: any) {
      console.error('OCR extraction failed:', error);
      throw new Error(`OCR failed: ${error?.message || 'Unknown error'}`);
    }
  }

  /**
   * Extract structured data from ID document
   */
  static async extractIDData(imageUrl: string): Promise<IDData> {
    const ocrResult = await this.extractText(imageUrl);
    const text = ocrResult.text;
    const lines = text.split('\n').map(line => line.trim()).filter(Boolean);

    // Initialize result
    const result: IDData = {
      confidence: ocrResult.confidence,
    };

    // Extract name (usually first few lines, often in ALL CAPS)
    const namePatterns = [
      /^([A-Z\s]{2,})\s*$/,
      /NAME[:\s]+([A-Z\s]+)/i,
      /^([A-Z]+,\s*[A-Z\s]+)$/,
    ];

    for (const line of lines.slice(0, 5)) {
      for (const pattern of namePatterns) {
        const match = line.match(pattern);
        if (match && match[1] && match[1].length > 3) {
          result.fullName = match[1].trim();
          break;
        }
      }
      if (result.fullName) break;
    }

    // Extract date of birth
    const dobPatterns = [
      /DOB[:\s]+(\d{1,2}[-\/]\d{1,2}[-\/]\d{2,4})/i,
      /BIRTH[:\s]+(\d{1,2}[-\/]\d{1,2}[-\/]\d{2,4})/i,
      /(\d{1,2}[-\/]\d{1,2}[-\/]\d{4})/,
    ];

    for (const line of lines) {
      for (const pattern of dobPatterns) {
        const match = line.match(pattern);
        if (match) {
          result.dateOfBirth = this.normalizeDate(match[1]);
          break;
        }
      }
      if (result.dateOfBirth) break;
    }

    // Extract ID number
    const idPatterns = [
      /(?:DL|ID|LIC)[#:\s]+([A-Z0-9]{5,})/i,
      /(?:NUMBER|NO)[:\s]+([A-Z0-9]{5,})/i,
    ];

    for (const line of lines) {
      for (const pattern of idPatterns) {
        const match = line.match(pattern);
        if (match) {
          result.idNumber = match[1].trim();
          break;
        }
      }
      if (result.idNumber) break;
    }

    // Extract expiration date
    const expPatterns = [
      /EXP[:\s]+(\d{1,2}[-\/]\d{1,2}[-\/]\d{2,4})/i,
      /EXPIRES[:\s]+(\d{1,2}[-\/]\d{1,2}[-\/]\d{2,4})/i,
    ];

    for (const line of lines) {
      for (const pattern of expPatterns) {
        const match = line.match(pattern);
        if (match) {
          result.expirationDate = this.normalizeDate(match[1]);
          break;
        }
      }
      if (result.expirationDate) break;
    }

    // Extract state (look for 2-letter state codes)
    const statePattern = /\b([A-Z]{2})\b/;
    for (const line of lines.slice(0, 10)) {
      const match = line.match(statePattern);
      if (match && this.isValidStateCode(match[1])) {
        result.issuingState = match[1];
        break;
      }
    }

    return result;
  }

  /**
   * Extract structured data from pay stub
   */
  static async extractPayStubData(imageUrl: string): Promise<PayStubData> {
    const ocrResult = await this.extractText(imageUrl);
    const text = ocrResult.text;
    const lines = text.split('\n').map(line => line.trim()).filter(Boolean);

    const result: PayStubData = {
      confidence: ocrResult.confidence,
      deposits: [],
      totalDeposits: 0,
    };

    // Extract employer name (usually at top)
    for (const line of lines.slice(0, 5)) {
      if (line.length > 3 && !line.match(/\d{2}[-\/]\d{2}[-\/]\d{2,4}/)) {
        result.employerName = line;
        break;
      }
    }

    // Extract employee name
    const namePatterns = [
      /EMPLOYEE[:\s]+([A-Z\s]+)/i,
      /NAME[:\s]+([A-Z\s]+)/i,
    ];

    for (const line of lines) {
      for (const pattern of namePatterns) {
        const match = line.match(pattern);
        if (match) {
          result.employeeName = match[1].trim();
          break;
        }
      }
      if (result.employeeName) break;
    }

    // Extract pay period dates
    const periodPattern = /(\d{1,2}[-\/]\d{1,2}[-\/]\d{2,4})\s*[-to]+\s*(\d{1,2}[-\/]\d{1,2}[-\/]\d{2,4})/i;
    for (const line of lines) {
      const match = line.match(periodPattern);
      if (match) {
        result.payPeriodStart = this.normalizeDate(match[1]);
        result.payPeriodEnd = this.normalizeDate(match[2]);
        break;
      }
    }

    // Extract gross pay
    const grossPatterns = [
      /GROSS[:\s]+\$?([\d,]+\.?\d*)/i,
      /TOTAL\s+GROSS[:\s]+\$?([\d,]+\.?\d*)/i,
    ];

    for (const line of lines) {
      for (const pattern of grossPatterns) {
        const match = line.match(pattern);
        if (match) {
          result.grossPay = this.parseAmount(match[1]);
          break;
        }
      }
      if (result.grossPay) break;
    }

    // Extract net pay
    const netPatterns = [
      /NET\s+PAY[:\s]+\$?([\d,]+\.?\d*)/i,
      /TAKE\s+HOME[:\s]+\$?([\d,]+\.?\d*)/i,
    ];

    for (const line of lines) {
      for (const pattern of netPatterns) {
        const match = line.match(pattern);
        if (match) {
          result.netPay = this.parseAmount(match[1]);
          break;
        }
      }
      if (result.netPay) break;
    }

    // Extract YTD gross
    const ytdPatterns = [
      /YTD\s+GROSS[:\s]+\$?([\d,]+\.?\d*)/i,
      /YEAR\s+TO\s+DATE[:\s]+\$?([\d,]+\.?\d*)/i,
    ];

    for (const line of lines) {
      for (const pattern of ytdPatterns) {
        const match = line.match(pattern);
        if (match) {
          result.yearToDateGross = this.parseAmount(match[1]);
          break;
        }
      }
      if (result.yearToDateGross) break;
    }

    return result;
  }

  /**
   * Extract structured data from bank statement
   */
  static async extractBankStatementData(imageUrl: string): Promise<BankStatementData> {
    const ocrResult = await this.extractText(imageUrl);
    const text = ocrResult.text;
    const lines = text.split('\n').map(line => line.trim()).filter(Boolean);

    const result: BankStatementData = {
      confidence: ocrResult.confidence,
      deposits: [],
      totalDeposits: 0,
    };

    // Extract account holder name
    const namePatterns = [
      /ACCOUNT\s+HOLDER[:\s]+([A-Z\s]+)/i,
      /NAME[:\s]+([A-Z\s]+)/i,
    ];

    for (const line of lines.slice(0, 10)) {
      for (const pattern of namePatterns) {
        const match = line.match(pattern);
        if (match) {
          result.accountHolderName = match[1].trim();
          break;
        }
      }
      if (result.accountHolderName) break;
    }

    // Extract statement period
    const periodPattern = /(\d{1,2}[-\/]\d{1,2}[-\/]\d{2,4})\s*[-to]+\s*(\d{1,2}[-\/]\d{1,2}[-\/]\d{2,4})/i;
    for (const line of lines.slice(0, 15)) {
      const match = line.match(periodPattern);
      if (match) {
        result.statementPeriodStart = this.normalizeDate(match[1]);
        result.statementPeriodEnd = this.normalizeDate(match[2]);
        break;
      }
    }

    // Extract deposits (look for date + amount patterns)
    const depositPattern = /(\d{1,2}[-\/]\d{1,2}[-\/]\d{2,4})\s+.*?\s+\$?([\d,]+\.?\d{2})/;
    
    for (const line of lines) {
      const match = line.match(depositPattern);
      if (match && line.toLowerCase().includes('deposit')) {
        const date = this.normalizeDate(match[1]);
        const amount = this.parseAmount(match[2]);
        
        if (date && amount > 0) {
          result.deposits.push({ date, amount });
          result.totalDeposits += amount;
        }
      }
    }

    return result;
  }

  /**
   * Helper: Normalize date format to YYYY-MM-DD
   */
  private static normalizeDate(dateStr: string): string {
    try {
      // Handle various date formats
      const parts = dateStr.split(/[-\/]/);
      
      if (parts.length === 3) {
        let [part1, part2, part3] = parts;
        
        // Convert 2-digit year to 4-digit
        if (part3.length === 2) {
          const year = parseInt(part3);
          part3 = year > 50 ? `19${part3}` : `20${part3}`;
        }
        
        // Assume MM/DD/YYYY format
        const month = part1.padStart(2, '0');
        const day = part2.padStart(2, '0');
        const year = part3;
        
        return `${year}-${month}-${day}`;
      }
      
      return dateStr;
    } catch {
      return dateStr;
    }
  }

  /**
   * Helper: Parse amount string to number
   */
  private static parseAmount(amountStr: string): number {
    try {
      return parseFloat(amountStr.replace(/,/g, ''));
    } catch {
      return 0;
    }
  }

  /**
   * Helper: Check if state code is valid
   */
  private static isValidStateCode(code: string): boolean {
    const states = [
      'AL', 'AK', 'AZ', 'AR', 'CA', 'CO', 'CT', 'DE', 'FL', 'GA',
      'HI', 'ID', 'IL', 'IN', 'IA', 'KS', 'KY', 'LA', 'ME', 'MD',
      'MA', 'MI', 'MN', 'MS', 'MO', 'MT', 'NE', 'NV', 'NH', 'NJ',
      'NM', 'NY', 'NC', 'ND', 'OH', 'OK', 'OR', 'PA', 'RI', 'SC',
      'SD', 'TN', 'TX', 'UT', 'VT', 'VA', 'WA', 'WV', 'WI', 'WY',
      'DC'
    ];
    return states.includes(code.toUpperCase());
  }

  /**
   * Cleanup worker pool (call on shutdown)
   */
  static async cleanup(): Promise<void> {
    for (const worker of this.workerPool) {
      await worker.terminate();
    }
    this.workerPool = [];
    this.isInitialized = false;
  }
}
