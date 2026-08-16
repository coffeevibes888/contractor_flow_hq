import { Html } from '@react-email/components';
import { Landlord } from '@prisma/client';

interface OwnerStatementEmailProps {
  ownerName: string;
  periodStart: string; // formatted: "Jan 1, 2026"
  periodEnd: string;
  totalIncome: number;
  totalExpense: number;
  netIncome: number;
  managementFee: number;
  distribution: number;
  statementUrl: string;
  notes?: string | null;
  landlord: Landlord;
}

function fmtCurrency(amount: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
  }).format(amount);
}

export default function OwnerStatementEmail({
  ownerName,
  periodStart,
  periodEnd,
  totalIncome,
  totalExpense,
  netIncome,
  managementFee,
  distribution,
  statementUrl,
  notes,
  landlord,
}: OwnerStatementEmailProps) {
  const landlordName = landlord.name;
  const logoUrl = landlord.logoUrl;

  const rootDomain = process.env.NEXT_PUBLIC_ROOT_DOMAIN || 'localhost:3000';
  const supportEmail = landlord.companyEmail || landlord.notificationEmail || `support@${landlord.subdomain}.${rootDomain}`;

  return (
    <Html>
      <head>
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
        <title>Owner Statement - {landlordName}</title>
        <style>{`
          body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
            line-height: 1.6;
            color: #374151;
            margin: 0;
            padding: 0;
            background-color: #f9fafb;
          }
          .container {
            max-width: 600px;
            margin: 0 auto;
            background-color: white;
            border-radius: 12px;
            box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);
            overflow: hidden;
          }
          .header {
            background: linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%);
            padding: 32px 24px;
            text-align: center;
          }
          .logo {
            max-width: 120px;
            height: auto;
            margin-bottom: 16px;
            border-radius: 8px;
            background: white;
            padding: 8px;
          }
          .company-name {
            color: white;
            font-size: 24px;
            font-weight: 600;
            margin: 0;
          }
          .header-subtitle {
            color: rgba(255, 255, 255, 0.85);
            font-size: 13px;
            margin: 6px 0 0;
            text-transform: uppercase;
            letter-spacing: 1.5px;
            font-weight: 500;
          }
          .content {
            padding: 32px 24px;
          }
          .greeting {
            font-size: 18px;
            font-weight: 600;
            margin-bottom: 16px;
            color: #111827;
          }
          .intro {
            font-size: 15px;
            color: #4b5563;
            margin-bottom: 24px;
          }
          .summary-card {
            background: linear-gradient(135deg, #f5f3ff 0%, #ede9fe 100%);
            border: 1px solid #c4b5fd;
            border-radius: 12px;
            padding: 24px;
            margin: 24px 0;
            text-align: center;
          }
          .summary-label {
            font-size: 11px;
            color: #6b21a8;
            text-transform: uppercase;
            letter-spacing: 1.5px;
            font-weight: 700;
            margin-bottom: 4px;
          }
          .summary-amount {
            font-size: 36px;
            font-weight: 700;
            color: #5b21b6;
            margin: 8px 0;
            letter-spacing: -1px;
          }
          .summary-period {
            font-size: 13px;
            color: #6b21a8;
          }
          .breakdown {
            background-color: #f8fafc;
            border: 1px solid #e2e8f0;
            border-radius: 8px;
            padding: 16px 20px;
            margin: 24px 0;
          }
          .breakdown-row {
            display: flex;
            justify-content: space-between;
            align-items: center;
            padding: 6px 0;
            font-size: 14px;
            color: #475569;
          }
          .breakdown-row.total {
            border-top: 2px solid #cbd5e1;
            margin-top: 8px;
            padding-top: 12px;
            font-weight: 700;
            color: #1e293b;
            font-size: 15px;
          }
          .breakdown-value {
            font-variant-numeric: tabular-nums;
            font-weight: 500;
          }
          .breakdown-value.positive { color: #047857; }
          .breakdown-value.negative { color: #b91c1c; }
          .cta-button {
            display: inline-block;
            background: linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%);
            color: white;
            text-decoration: none;
            padding: 16px 32px;
            border-radius: 8px;
            font-weight: 600;
            font-size: 16px;
            text-align: center;
            margin: 16px 0;
            box-shadow: 0 4px 6px -1px rgba(99, 102, 241, 0.3);
          }
          .cta-wrap { text-align: center; }
          .notes-box {
            background-color: #fef9c3;
            border-left: 4px solid #facc15;
            border-radius: 0 6px 6px 0;
            padding: 14px 16px;
            margin: 20px 0;
            font-size: 13px;
            color: #713f12;
          }
          .footer {
            background-color: #f9fafb;
            padding: 24px;
            text-align: center;
            border-top: 1px solid #e5e7eb;
          }
          .footer-text {
            color: #6b7280;
            font-size: 13px;
            margin: 0;
          }
          .help-link {
            color: #6366f1;
            text-decoration: none;
            font-weight: 500;
          }
          @media only screen and (max-width: 600px) {
            .container { margin: 8px; border-radius: 8px; }
            .header { padding: 24px 16px; }
            .content { padding: 24px 16px; }
            .summary-amount { font-size: 30px; }
            .cta-button { padding: 14px 24px; font-size: 15px; }
          }
        `}</style>
      </head>
      <body>
        <div className="container">
          <div className="header">
            {logoUrl ? (
              <img src={logoUrl} alt={landlordName} className="logo" />
            ) : (
              <div style={{
                width: '120px',
                height: '40px',
                background: 'white',
                borderRadius: '8px',
                margin: '0 auto 16px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#6366f1',
                fontWeight: 'bold',
                fontSize: '18px',
              }}>
                {landlordName}
              </div>
            )}
            <h1 className="company-name">{landlordName}</h1>
            <p className="header-subtitle">Owner Distribution Statement</p>
          </div>

          <div className="content">
            <h2 className="greeting">Hi {ownerName},</h2>

            <p className="intro">
              Your monthly owner distribution statement is ready. Below is a summary — the full statement is attached as a PDF.
            </p>

            <div className="summary-card">
              <div className="summary-label">Your Distribution</div>
              <div className="summary-amount">{fmtCurrency(distribution)}</div>
              <div className="summary-period">{periodStart} – {periodEnd}</div>
            </div>

            <div className="breakdown">
              <div className="breakdown-row">
                <span>Total Income</span>
                <span className="breakdown-value positive">{fmtCurrency(totalIncome)}</span>
              </div>
              <div className="breakdown-row">
                <span>Operating Expenses</span>
                <span className="breakdown-value negative">({fmtCurrency(totalExpense)})</span>
              </div>
              <div className="breakdown-row">
                <span>Net Operating Income</span>
                <span className="breakdown-value">{fmtCurrency(netIncome)}</span>
              </div>
              <div className="breakdown-row">
                <span>Management Fee</span>
                <span className="breakdown-value negative">({fmtCurrency(managementFee)})</span>
              </div>
              <div className="breakdown-row total">
                <span>Distribution to You</span>
                <span className="breakdown-value positive">{fmtCurrency(distribution)}</span>
              </div>
            </div>

            {notes && (
              <div className="notes-box">
                <strong>Note from your manager:</strong> {notes}
              </div>
            )}

            <div className="cta-wrap">
              <a href={statementUrl} className="cta-button">
                View &amp; Download Full Statement
              </a>
            </div>

            <p style={{ fontSize: '13px', color: '#6b7280', textAlign: 'center', marginTop: '8px' }}>
              The link is personalized to this statement and will remain available for 90 days.
            </p>
          </div>

          <div className="footer">
            <p className="footer-text">
              Questions about this statement? Reply to this email or contact us at{' '}
              <a href={`mailto:${supportEmail}`} className="help-link">{supportEmail}</a>
            </p>
            <p className="footer-text" style={{ marginTop: '8px' }}>
              &copy; {new Date().getFullYear()} {landlordName}. All rights reserved.
            </p>
          </div>
        </div>
      </body>
    </Html>
  );
}
