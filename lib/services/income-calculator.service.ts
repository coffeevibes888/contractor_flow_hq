import { prisma as db } from '@/db/prisma';
import type { PayStubData, BankStatementData } from './ocr.service';

export class IncomeCalculatorService {
  /**
   * Calculate monthly income from employment documents
   */
  static async calculateMonthlyIncome(applicationId: string): Promise<number> {
    // Get all verified employment documents
    const employmentDocs = await db.verificationDocument.findMany({
      where: {
        applicationId,
        category: 'employment',
        verificationStatus: 'verified',
      },
    });

    if (employmentDocs.length === 0) {
      return 0;
    }

    const incomes: number[] = [];

    for (const doc of employmentDocs) {
      const extractedData = doc.extractedData as any;
      
      if (!extractedData) continue;

      if (doc.docType === 'pay_stub') {
        const income = this.calculateFromPayStub(extractedData as PayStubData);
        if (income > 0) incomes.push(income);
      } else if (doc.docType === 'bank_statement') {
        const income = this.calculateFromBankStatement(extractedData as BankStatementData);
        if (income > 0) incomes.push(income);
      } else if (doc.docType === 'tax_document') {
        const income = this.calculateFromTaxDocument(extractedData);
        if (income > 0) incomes.push(income);
      }
    }

    if (incomes.length === 0) {
      return 0;
    }

    // Return average monthly income
    const averageIncome = incomes.reduce((sum, income) => sum + income, 0) / incomes.length;
    return Math.round(averageIncome * 100) / 100; // Round to 2 decimal places
  }

  /**
   * Calculate monthly income from pay stub
   */
  private static calculateFromPayStub(payStubData: PayStubData): number {
    if (!payStubData.grossPay) return 0;

    // Determine pay frequency from pay period dates
    if (payStubData.payPeriodStart && payStubData.payPeriodEnd) {
      const start = new Date(payStubData.payPeriodStart);
      const end = new Date(payStubData.payPeriodEnd);
      const daysDiff = Math.abs((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));

      // Weekly (7 days)
      if (daysDiff >= 6 && daysDiff <= 8) {
        return payStubData.grossPay * 4.33; // Average weeks per month
      }
      
      // Bi-weekly (14 days)
      if (daysDiff >= 13 && daysDiff <= 15) {
        return payStubData.grossPay * 2.17; // Average bi-weekly periods per month
      }
      
      // Semi-monthly (15 days)
      if (daysDiff >= 14 && daysDiff <= 16) {
        return payStubData.grossPay * 2;
      }
      
      // Monthly (30 days)
      if (daysDiff >= 28 && daysDiff <= 32) {
        return payStubData.grossPay;
      }
    }

    // Default: assume bi-weekly if we can't determine
    return payStubData.grossPay * 2.17;
  }

  /**
   * Calculate monthly income from bank statement
   */
  private static calculateFromBankStatement(bankData: BankStatementData): number {
    if (!bankData.deposits || bankData.deposits.length === 0) {
      return 0;
    }

    // Calculate total deposits
    const totalDeposits = bankData.deposits.reduce((sum, deposit) => sum + deposit.amount, 0);

    // Determine statement period length
    if (bankData.statementPeriodStart && bankData.statementPeriodEnd) {
      const start = new Date(bankData.statementPeriodStart);
      const end = new Date(bankData.statementPeriodEnd);
      const daysDiff = Math.abs((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));

      // Normalize to monthly
      const monthlyIncome = (totalDeposits / daysDiff) * 30;
      return monthlyIncome;
    }

    // If we can't determine period, assume the total is for one month
    return totalDeposits;
  }

  /**
   * Calculate monthly income from tax document
   */
  private static calculateFromTaxDocument(taxData: any): number {
    // Look for annual income fields
    const annualIncome = 
      taxData.annualIncome || 
      taxData.totalIncome || 
      taxData.adjustedGrossIncome || 
      taxData.grossIncome ||
      0;

    if (annualIncome > 0) {
      return annualIncome / 12;
    }

    return 0;
  }

  /**
   * Check if monthly income meets minimum requirements (typically 3x rent)
   */
  static async meetsIncomeRequirements(
    applicationId: string,
    rentAmount: number,
    multiplier: number = 3
  ): Promise<boolean> {
    const monthlyIncome = await this.calculateMonthlyIncome(applicationId);
    const requiredIncome = rentAmount * multiplier;
    
    return monthlyIncome >= requiredIncome;
  }

  /**
   * Get income verification details for an application
   */
  static async getIncomeVerificationDetails(applicationId: string): Promise<{
    monthlyIncome: number;
    documentCount: number;
    meetsRequirement: boolean;
    requiredIncome: number;
  }> {
    // Get application with unit rent amount
    const application = await db.rentalApplication.findUnique({
      where: { id: applicationId },
      include: {
        unit: true,
      },
    });

    if (!application || !application.unit) {
      throw new Error('Application or unit not found');
    }

    const rentAmount = parseFloat(application.unit.rentAmount.toString());
    const monthlyIncome = await this.calculateMonthlyIncome(applicationId);
    const requiredIncome = rentAmount * 3;
    const meetsRequirement = monthlyIncome >= requiredIncome;

    // Count verified employment documents
    const documentCount = await db.verificationDocument.count({
      where: {
        applicationId,
        category: 'employment',
        verificationStatus: 'verified',
      },
    });

    return {
      monthlyIncome,
      documentCount,
      meetsRequirement,
      requiredIncome,
    };
  }
}
