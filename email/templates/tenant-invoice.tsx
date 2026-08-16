import { Html } from '@react-email/components';

interface TenantInvoiceEmailProps {
  tenantName: string;
  landlordName: string;
  invoiceNumber: string;
  propertyName: string;
  unitName?: string;
  amount: number;
  reason: string;
  description?: string | null;
  dueDate: string;
  invoiceUrl?: string;
}

function fmtCurrency(n: number) {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(n);
}

export default function TenantInvoiceEmail({
  tenantName,
  landlordName,
  invoiceNumber,
  propertyName,
  unitName,
  amount,
  reason,
  description,
  dueDate,
  invoiceUrl,
}: TenantInvoiceEmailProps) {
  return (
    <Html>
      <head>
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
        <title>Invoice {invoiceNumber}</title>
        <style>{`
          body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Arial, sans-serif; margin: 0; padding: 0; background: #f4f6fa; color: #1f2328; }
          .wrap { max-width: 600px; margin: 32px auto; background: #ffffff; border-radius: 12px; overflow: hidden; border: 1px solid #e5e7eb; }
          .header { background: #4f46e5; padding: 32px 32px 24px; }
          .header h1 { margin: 0; color: #ffffff; font-size: 22px; font-weight: 700; }
          .header p { margin: 6px 0 0; color: #c7d2fe; font-size: 13px; }
          .body { padding: 32px; }
          .greeting { font-size: 16px; margin-bottom: 20px; color: #374151; }
          .invoice-box { border: 1px solid #e5e7eb; border-radius: 8px; overflow: hidden; margin-bottom: 24px; }
          .invoice-header { background: #f9fafb; padding: 14px 20px; display: flex; justify-content: space-between; border-bottom: 1px solid #e5e7eb; }
          .invoice-header span { font-size: 12px; color: #6b7280; text-transform: uppercase; letter-spacing: 0.05em; font-weight: 600; }
          .invoice-header strong { font-size: 14px; color: #111827; font-weight: 700; }
          .line-row { padding: 14px 20px; border-bottom: 1px solid #f3f4f6; display: flex; justify-content: space-between; }
          .line-row:last-child { border-bottom: none; }
          .line-label { font-size: 14px; color: #6b7280; }
          .line-value { font-size: 14px; color: #111827; font-weight: 500; }
          .amount-row { padding: 16px 20px; background: #f0fdf4; }
          .amount-label { font-size: 13px; color: #166534; font-weight: 600; }
          .amount-value { font-size: 22px; color: #166534; font-weight: 800; }
          .due-badge { display: inline-block; padding: 3px 10px; background: #fef3c7; color: #92400e; border-radius: 99px; font-size: 12px; font-weight: 600; }
          .cta { display: inline-block; margin-top: 24px; background: #4f46e5; color: #ffffff; text-decoration: none; padding: 14px 28px; border-radius: 8px; font-weight: 600; font-size: 15px; }
          .footer { background: #f9fafb; padding: 20px 32px; text-align: center; border-top: 1px solid #e5e7eb; }
          .footer p { margin: 0; font-size: 12px; color: #9ca3af; }
        `}</style>
      </head>
      <body>
        <div className="wrap">
          <div className="header">
            <h1>Invoice from {landlordName}</h1>
            <p>Invoice #{invoiceNumber}</p>
          </div>
          <div className="body">
            <p className="greeting">Hi {tenantName},</p>
            <p style={{ color: '#6b7280', marginBottom: '24px', fontSize: '15px' }}>
              You have a new invoice from <strong>{landlordName}</strong>. Please review the details below and pay by the due date to avoid any late fees.
            </p>

            <div className="invoice-box">
              <div className="invoice-header">
                <div>
                  <div><span>Invoice #</span></div>
                  <div><strong>{invoiceNumber}</strong></div>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <div><span>Due Date</span></div>
                  <div><span className="due-badge">{dueDate}</span></div>
                </div>
              </div>

              <div className="line-row">
                <span className="line-label">Property</span>
                <span className="line-value">{propertyName}{unitName ? ` — ${unitName}` : ''}</span>
              </div>
              <div className="line-row">
                <span className="line-label">Charge</span>
                <span className="line-value">{reason}</span>
              </div>
              {description && (
                <div className="line-row">
                  <span className="line-label">Details</span>
                  <span className="line-value" style={{ maxWidth: '320px', textAlign: 'right' }}>{description}</span>
                </div>
              )}
              <div className="amount-row" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span className="amount-label">Amount Due</span>
                <span className="amount-value">{fmtCurrency(amount)}</span>
              </div>
            </div>

            {invoiceUrl && (
              <div style={{ textAlign: 'center' }}>
                <a href={invoiceUrl} className="cta">View &amp; Pay Invoice</a>
              </div>
            )}

            <p style={{ marginTop: '28px', fontSize: '13px', color: '#9ca3af' }}>
              If you have any questions about this invoice, please contact your property manager directly.
            </p>
          </div>
          <div className="footer">
            <p>© {new Date().getFullYear()} {landlordName} · Powered by Property Flow HQ</p>
          </div>
        </div>
      </body>
    </Html>
  );
}
