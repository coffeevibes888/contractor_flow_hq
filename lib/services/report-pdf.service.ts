import { htmlToPdfBuffer } from './pdf';

interface InvestorReportData {
  periodLabel: string;
  generatedAt: string;
  preparedBy: string;
  executiveSummary: {
    totalIncome: number;
    totalExpenses: number;
    netOperatingIncome: number;
    incomeGrowth: string;
    expenseGrowth: string;
    netGrowth: string;
    previousPeriodIncome: number;
    previousPeriodExpenses: number;
    previousPeriodNet: number;
  };
  portfolio: {
    propertyCount: number;
    totalUnits: number;
    occupiedUnits: number;
    vacantUnits: number;
    occupancyRate: string;
    avgRentPerUnit: number;
  };
  metrics: {
    grossYield: string;
    operatingExpenseRatio: string;
  };
  propertyPerformance: Array<{
    name: string;
    address: string;
    units: number;
    occupancyRate: number;
    income: number;
    expenses: number;
    noi: number;
    incomeChange: string;
    collectionRate: number;
  }>;
  charts: {
    monthlyTrend: Array<{
      month: string;
      income: number;
      expenses: number;
      net: number;
    }>;
    expenseBreakdown: Array<{
      category: string;
      amount: number;
      percentage: string;
    }>;
  };
  collectionSummary: {
    totalDue: number;
    collected: number;
    outstanding: number;
    collectionRate: number;
  };
  leaseSummary: {
    activeLeases: number;
    expiringIn30Days: number;
    expiringIn90Days: number;
    monthToMonth: number;
  };
}

export async function generateInvestorReportPdf(data: InvestorReportData): Promise<Buffer> {
  const html = generateInvestorReportHtml(data);
  return htmlToPdfBuffer(html);
}

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
}

function generateInvestorReportHtml(data: InvestorReportData): string {
  const { executiveSummary, portfolio, propertyPerformance, charts, collectionSummary, leaseSummary } = data;
  
  // Generate chart data for inline SVG charts
  const maxIncome = Math.max(...charts.monthlyTrend.map(m => m.income), 1);
  const maxExpense = Math.max(...charts.monthlyTrend.map(m => m.expenses), 1);
  const chartMax = Math.max(maxIncome, maxExpense);

  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <style>
    * {
      margin: 0;
      padding: 0;
      box-sizing: border-box;
    }
    
    body {
      font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
      font-size: 11px;
      line-height: 1.5;
      color: #1e293b;
      background: #fff;
    }
    
    .page {
      padding: 40px;
      max-width: 800px;
      margin: 0 auto;
    }
    
    .header {
      text-align: center;
      margin-bottom: 30px;
      padding-bottom: 20px;
      border-bottom: 3px solid #6366f1;
    }
    
    .header h1 {
      font-size: 28px;
      color: #1e293b;
      margin-bottom: 5px;
      font-weight: 700;
    }
    
    .header .subtitle {
      font-size: 16px;
      color: #6366f1;
      font-weight: 600;
    }
    
    .header .meta {
      font-size: 10px;
      color: #64748b;
      margin-top: 10px;
    }
    
    .section {
      margin-bottom: 25px;
    }
    
    .section-title {
      font-size: 14px;
      font-weight: 700;
      color: #1e293b;
      margin-bottom: 12px;
      padding-bottom: 6px;
      border-bottom: 2px solid #e2e8f0;
      display: flex;
      align-items: center;
      gap: 8px;
    }
    
    .section-title::before {
      content: '';
      width: 4px;
      height: 18px;
      background: linear-gradient(135deg, #6366f1, #8b5cf6);
      border-radius: 2px;
    }
    
    /* Executive Summary Cards */
    .summary-grid {
      display: grid;
      grid-template-columns: repeat(3, 1fr);
      gap: 15px;
      margin-bottom: 20px;
    }
    
    .summary-card {
      padding: 15px;
      border-radius: 10px;
      text-align: center;
    }
    
    .summary-card.income {
      background: linear-gradient(135deg, #10b981, #059669);
      color: white;
    }
    
    .summary-card.expense {
      background: linear-gradient(135deg, #ef4444, #dc2626);
      color: white;
    }
    
    .summary-card.net {
      background: linear-gradient(135deg, #6366f1, #8b5cf6);
      color: white;
    }
    
    .summary-card .label {
      font-size: 10px;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      opacity: 0.9;
    }
    
    .summary-card .value {
      font-size: 22px;
      font-weight: 700;
      margin: 5px 0;
    }
    
    .summary-card .change {
      font-size: 10px;
      opacity: 0.9;
    }
    
    .change.positive::before { content: '▲ '; }
    .change.negative::before { content: '▼ '; }
    
    /* Portfolio Stats */
    .stats-row {
      display: grid;
      grid-template-columns: repeat(4, 1fr);
      gap: 10px;
      margin-bottom: 15px;
    }
    
    .stat-box {
      background: #f8fafc;
      border: 1px solid #e2e8f0;
      border-radius: 8px;
      padding: 12px;
      text-align: center;
    }
    
    .stat-box .stat-value {
      font-size: 18px;
      font-weight: 700;
      color: #1e293b;
    }
    
    .stat-box .stat-label {
      font-size: 9px;
      color: #64748b;
      text-transform: uppercase;
      letter-spacing: 0.3px;
    }
    
    /* Tables */
    table {
      width: 100%;
      border-collapse: collapse;
      font-size: 10px;
    }
    
    th {
      background: #f1f5f9;
      padding: 10px 8px;
      text-align: left;
      font-weight: 600;
      color: #475569;
      text-transform: uppercase;
      font-size: 9px;
      letter-spacing: 0.3px;
      border-bottom: 2px solid #e2e8f0;
    }
    
    td {
      padding: 10px 8px;
      border-bottom: 1px solid #f1f5f9;
    }
    
    tr:hover {
      background: #fafafa;
    }
    
    .text-right { text-align: right; }
    .text-center { text-align: center; }
    
    .positive { color: #10b981; }
    .negative { color: #ef4444; }
    
    /* Chart Container */
    .chart-container {
      background: #f8fafc;
      border-radius: 10px;
      padding: 15px;
      margin-bottom: 15px;
    }
    
    .chart-title {
      font-size: 11px;
      font-weight: 600;
      color: #475569;
      margin-bottom: 10px;
    }
    
    /* Bar Chart */
    .bar-chart {
      display: flex;
      align-items: flex-end;
      gap: 8px;
      height: 120px;
      padding-top: 10px;
    }
    
    .bar-group {
      flex: 1;
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 4px;
    }
    
    .bars {
      display: flex;
      gap: 2px;
      align-items: flex-end;
      height: 100px;
    }
    
    .bar {
      width: 12px;
      border-radius: 3px 3px 0 0;
      min-height: 2px;
    }
    
    .bar.income { background: linear-gradient(180deg, #10b981, #059669); }
    .bar.expense { background: linear-gradient(180deg, #ef4444, #dc2626); }
    
    .bar-label {
      font-size: 8px;
      color: #64748b;
    }
    
    /* Expense Breakdown */
    .expense-list {
      display: grid;
      grid-template-columns: repeat(2, 1fr);
      gap: 8px;
    }
    
    .expense-item {
      display: flex;
      align-items: center;
      gap: 8px;
      padding: 8px;
      background: #f8fafc;
      border-radius: 6px;
    }
    
    .expense-color {
      width: 12px;
      height: 12px;
      border-radius: 3px;
    }
    
    .expense-info {
      flex: 1;
    }
    
    .expense-category {
      font-size: 10px;
      font-weight: 500;
      color: #1e293b;
    }
    
    .expense-amount {
      font-size: 9px;
      color: #64748b;
    }
    
    /* Collection Progress */
    .progress-bar {
      height: 20px;
      background: #e2e8f0;
      border-radius: 10px;
      overflow: hidden;
      margin: 10px 0;
    }
    
    .progress-fill {
      height: 100%;
      background: linear-gradient(90deg, #10b981, #059669);
      border-radius: 10px;
      display: flex;
      align-items: center;
      justify-content: center;
      color: white;
      font-size: 10px;
      font-weight: 600;
    }
    
    /* Footer */
    .footer {
      margin-top: 30px;
      padding-top: 15px;
      border-top: 1px solid #e2e8f0;
      text-align: center;
      font-size: 9px;
      color: #94a3b8;
    }
    
    /* Page Break */
    .page-break {
      page-break-before: always;
    }
    
    /* Two Column Layout */
    .two-col {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 20px;
    }
    
    /* Lease Alert */
    .alert {
      padding: 10px 15px;
      border-radius: 8px;
      margin-bottom: 10px;
      display: flex;
      align-items: center;
      gap: 10px;
    }
    
    .alert.warning {
      background: #fef3c7;
      border: 1px solid #f59e0b;
      color: #92400e;
    }
    
    .alert.info {
      background: #dbeafe;
      border: 1px solid #3b82f6;
      color: #1e40af;
    }
    
    .alert-icon {
      font-size: 16px;
    }
  </style>
</head>
<body>
  <div class="page">
    <!-- Header -->
    <div class="header">
      <h1>Investor Report</h1>
      <div class="subtitle">${data.periodLabel}</div>
      <div class="meta">
        Prepared by ${data.preparedBy} • Generated ${new Date(data.generatedAt).toLocaleDateString('en-US', { 
          year: 'numeric', month: 'long', day: 'numeric' 
        })}
      </div>
    </div>

    <!-- Executive Summary -->
    <div class="section">
      <div class="section-title">Executive Summary</div>
      <div class="summary-grid">
        <div class="summary-card income">
          <div class="label">Total Income</div>
          <div class="value">${formatCurrency(executiveSummary.totalIncome)}</div>
          <div class="change ${parseFloat(executiveSummary.incomeGrowth) >= 0 ? 'positive' : 'negative'}">
            ${executiveSummary.incomeGrowth}% vs prior period
          </div>
        </div>
        <div class="summary-card expense">
          <div class="label">Total Expenses</div>
          <div class="value">${formatCurrency(executiveSummary.totalExpenses)}</div>
          <div class="change ${parseFloat(executiveSummary.expenseGrowth) <= 0 ? 'positive' : 'negative'}">
            ${executiveSummary.expenseGrowth}% vs prior period
          </div>
        </div>
        <div class="summary-card net">
          <div class="label">Net Operating Income</div>
          <div class="value">${formatCurrency(executiveSummary.netOperatingIncome)}</div>
          <div class="change ${parseFloat(executiveSummary.netGrowth) >= 0 ? 'positive' : 'negative'}">
            ${executiveSummary.netGrowth}% vs prior period
          </div>
        </div>
      </div>
    </div>

    <!-- Portfolio Overview -->
    <div class="section">
      <div class="section-title">Portfolio Overview</div>
      <div class="stats-row">
        <div class="stat-box">
          <div class="stat-value">${portfolio.propertyCount}</div>
          <div class="stat-label">Properties</div>
        </div>
        <div class="stat-box">
          <div class="stat-value">${portfolio.totalUnits}</div>
          <div class="stat-label">Total Units</div>
        </div>
        <div class="stat-box">
          <div class="stat-value">${portfolio.occupancyRate}%</div>
          <div class="stat-label">Occupancy Rate</div>
        </div>
        <div class="stat-box">
          <div class="stat-value">${formatCurrency(portfolio.avgRentPerUnit)}</div>
          <div class="stat-label">Avg Rent/Unit</div>
        </div>
      </div>
    </div>

    <!-- Income vs Expenses Chart -->
    <div class="section">
      <div class="section-title">Monthly Performance</div>
      <div class="chart-container">
        <div class="chart-title">Income vs Expenses by Month</div>
        <div class="bar-chart">
          ${charts.monthlyTrend.map(m => `
            <div class="bar-group">
              <div class="bars">
                <div class="bar income" style="height: ${(m.income / chartMax) * 100}px"></div>
                <div class="bar expense" style="height: ${(m.expenses / chartMax) * 100}px"></div>
              </div>
              <div class="bar-label">${m.month}</div>
            </div>
          `).join('')}
        </div>
        <div style="display: flex; justify-content: center; gap: 20px; margin-top: 10px; font-size: 9px;">
          <span><span style="display: inline-block; width: 10px; height: 10px; background: #10b981; border-radius: 2px; margin-right: 4px;"></span>Income</span>
          <span><span style="display: inline-block; width: 10px; height: 10px; background: #ef4444; border-radius: 2px; margin-right: 4px;"></span>Expenses</span>
        </div>
      </div>
    </div>

    <!-- Quarterly Breakdown -->
    <div class="section">
      <div class="section-title">Quarterly Breakdown</div>
      <div class="stats-row">
        ${[1, 2, 3, 4].map(q => {
          const quarterMonths = charts.monthlyTrend.slice((q - 1) * 3, q * 3);
          const quarterIncome = quarterMonths.reduce((sum: number, m: any) => sum + m.income, 0);
          const quarterExpenses = quarterMonths.reduce((sum: number, m: any) => sum + m.expenses, 0);
          const quarterNet = quarterIncome - quarterExpenses;
          return `
            <div class="stat-box" style="text-align: left; padding: 15px;">
              <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px;">
                <span style="font-size: 14px; font-weight: 700; color: #1e293b;">Q${q}</span>
                <span style="font-size: 11px; font-weight: 600; color: ${quarterNet >= 0 ? '#10b981' : '#ef4444'};">
                  ${quarterNet >= 0 ? '+' : ''}${formatCurrency(quarterNet)}
                </span>
              </div>
              <div style="font-size: 9px; color: #64748b;">
                <div style="display: flex; justify-content: space-between; margin-bottom: 2px;">
                  <span>Income:</span>
                  <span style="color: #10b981;">${formatCurrency(quarterIncome)}</span>
                </div>
                <div style="display: flex; justify-content: space-between;">
                  <span>Expenses:</span>
                  <span style="color: #ef4444;">${formatCurrency(quarterExpenses)}</span>
                </div>
              </div>
            </div>
          `;
        }).join('')}
      </div>
      <div style="background: linear-gradient(90deg, #f97316, #f59e0b); padding: 12px 15px; border-radius: 8px; margin-top: 10px;">
        <div style="display: flex; justify-content: space-between; align-items: center; color: white; font-size: 11px;">
          <span style="font-weight: 600;">Annual Total</span>
          <div style="display: flex; gap: 15px;">
            <span>Income: ${formatCurrency(charts.monthlyTrend.reduce((sum: number, m: any) => sum + m.income, 0))}</span>
            <span>Expenses: ${formatCurrency(charts.monthlyTrend.reduce((sum: number, m: any) => sum + m.expenses, 0))}</span>
            <span style="font-weight: 700;">Net: ${formatCurrency(charts.monthlyTrend.reduce((sum: number, m: any) => sum + m.income - m.expenses, 0))}</span>
          </div>
        </div>
      </div>
    </div>

    <!-- Collection Summary -->
    <div class="section">
      <div class="section-title">Rent Collection</div>
      <div class="stats-row">
        <div class="stat-box">
          <div class="stat-value">${formatCurrency(collectionSummary.totalDue)}</div>
          <div class="stat-label">Total Due</div>
        </div>
        <div class="stat-box">
          <div class="stat-value">${formatCurrency(collectionSummary.collected)}</div>
          <div class="stat-label">Collected</div>
        </div>
        <div class="stat-box">
          <div class="stat-value">${formatCurrency(collectionSummary.outstanding)}</div>
          <div class="stat-label">Outstanding</div>
        </div>
        <div class="stat-box">
          <div class="stat-value">${collectionSummary.collectionRate}%</div>
          <div class="stat-label">Collection Rate</div>
        </div>
      </div>
      <div class="progress-bar">
        <div class="progress-fill" style="width: ${collectionSummary.collectionRate}%">
          ${collectionSummary.collectionRate}% Collected
        </div>
      </div>
    </div>

    <!-- Expense Breakdown -->
    ${charts.expenseBreakdown.length > 0 ? `
    <div class="section">
      <div class="section-title">Expense Breakdown</div>
      <div class="expense-list">
        ${charts.expenseBreakdown.map((e, i) => {
          const colors = ['#6366f1', '#8b5cf6', '#ec4899', '#f59e0b', '#10b981', '#3b82f6', '#ef4444', '#64748b'];
          return `
            <div class="expense-item">
              <div class="expense-color" style="background: ${colors[i % colors.length]}"></div>
              <div class="expense-info">
                <div class="expense-category">${e.category}</div>
                <div class="expense-amount">${formatCurrency(e.amount)} (${e.percentage}%)</div>
              </div>
            </div>
          `;
        }).join('')}
      </div>
    </div>
    ` : ''}

    <!-- Lease Summary -->
    <div class="section">
      <div class="section-title">Lease Summary</div>
      ${leaseSummary.expiringIn30Days > 0 ? `
        <div class="alert warning">
          <span class="alert-icon">⚠️</span>
          <span><strong>${leaseSummary.expiringIn30Days}</strong> lease(s) expiring within 30 days</span>
        </div>
      ` : ''}
      <div class="stats-row">
        <div class="stat-box">
          <div class="stat-value">${leaseSummary.activeLeases}</div>
          <div class="stat-label">Active Leases</div>
        </div>
        <div class="stat-box">
          <div class="stat-value">${leaseSummary.expiringIn30Days}</div>
          <div class="stat-label">Expiring (30 days)</div>
        </div>
        <div class="stat-box">
          <div class="stat-value">${leaseSummary.expiringIn90Days}</div>
          <div class="stat-label">Expiring (90 days)</div>
        </div>
        <div class="stat-box">
          <div class="stat-value">${leaseSummary.monthToMonth}</div>
          <div class="stat-label">Month-to-Month</div>
        </div>
      </div>
    </div>

    <!-- Property Performance Table -->
    <div class="section">
      <div class="section-title">Property Performance</div>
      <table>
        <thead>
          <tr>
            <th>Property</th>
            <th class="text-center">Units</th>
            <th class="text-center">Occupancy</th>
            <th class="text-right">Income</th>
            <th class="text-right">Expenses</th>
            <th class="text-right">NOI</th>
            <th class="text-center">Collection</th>
          </tr>
        </thead>
        <tbody>
          ${propertyPerformance.map(p => `
            <tr>
              <td>
                <strong>${p.name}</strong>
                <div style="font-size: 8px; color: #64748b;">${p.address}</div>
              </td>
              <td class="text-center">${p.units}</td>
              <td class="text-center">${p.occupancyRate}%</td>
              <td class="text-right positive">${formatCurrency(p.income)}</td>
              <td class="text-right negative">${formatCurrency(p.expenses)}</td>
              <td class="text-right ${p.noi >= 0 ? 'positive' : 'negative'}">${formatCurrency(p.noi)}</td>
              <td class="text-center">${p.collectionRate}%</td>
            </tr>
          `).join('')}
        </tbody>
      </table>
    </div>

    <!-- Footer -->
    <div class="footer">
      <p>This report is generated automatically and is intended for informational purposes only.</p>
      <p>© ${new Date().getFullYear()} Property Management System • Confidential</p>
    </div>
  </div>
</body>
</html>
  `;
}

export function generateFinancialCSV(data: any): string {
  const lines: string[] = [];
  
  lines.push('FINANCIAL REPORT');
  lines.push(`Period,${data.periodLabel}`);
  lines.push(`Generated,${new Date(data.generatedAt).toLocaleString()}`);
  lines.push('');
  
  lines.push('EXECUTIVE SUMMARY');
  lines.push('Metric,Current Period,Previous Period,Change');
  lines.push(`Total Income,${data.executiveSummary.totalIncome},${data.executiveSummary.previousPeriodIncome},${data.executiveSummary.incomeGrowth}%`);
  lines.push(`Total Expenses,${data.executiveSummary.totalExpenses},${data.executiveSummary.previousPeriodExpenses},${data.executiveSummary.expenseGrowth}%`);
  lines.push(`Net Operating Income,${data.executiveSummary.netOperatingIncome},${data.executiveSummary.previousPeriodNet},${data.executiveSummary.netGrowth}%`);
  lines.push('');

  lines.push('PORTFOLIO OVERVIEW');
  lines.push('Metric,Value');
  lines.push(`Properties,${data.portfolio.propertyCount}`);
  lines.push(`Total Units,${data.portfolio.totalUnits}`);
  lines.push(`Occupied Units,${data.portfolio.occupiedUnits}`);
  lines.push(`Vacant Units,${data.portfolio.vacantUnits}`);
  lines.push(`Occupancy Rate,${data.portfolio.occupancyRate}%`);
  lines.push(`Avg Rent Per Unit,$${data.portfolio.avgRentPerUnit}`);
  lines.push('');

  lines.push('PROPERTY PERFORMANCE');
  lines.push('Property,Address,Units,Occupancy,Income,Expenses,NOI,Collection Rate');
  data.propertyPerformance.forEach((p: any) => {
    lines.push(`"${p.name}","${p.address}",${p.units},${p.occupancyRate}%,$${p.income},$${p.expenses},$${p.noi},${p.collectionRate}%`);
  });
  lines.push('');

  lines.push('MONTHLY BREAKDOWN');
  lines.push('Month,Income,Expenses,Net');
  data.charts.monthlyTrend.forEach((m: any) => {
    lines.push(`${m.month} ${m.year},$${m.income},$${m.expenses},$${m.net}`);
  });
  lines.push('');

  if (data.charts.expenseBreakdown.length > 0) {
    lines.push('EXPENSE BREAKDOWN');
    lines.push('Category,Amount,Percentage');
    data.charts.expenseBreakdown.forEach((e: any) => {
      lines.push(`"${e.category}",$${e.amount},${e.percentage}%`);
    });
  }

  return lines.join('\n');
}
