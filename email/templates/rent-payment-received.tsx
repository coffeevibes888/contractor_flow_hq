import { Html } from '@react-email/components';

interface RentPaymentReceivedEmailProps {
  landlordName: string;
  tenantName: string;
  propertyName: string;
  unitNumber: string;
  amount: string;
  paymentMethod: string;
  paidAt: string;
  estimatedArrival: string;
  logoUrl?: string | null;
}

export default function RentPaymentReceivedEmail({
  landlordName,
  tenantName,
  propertyName,
  unitNumber,
  amount,
  paymentMethod,
  paidAt,
  estimatedArrival,
  logoUrl,
}: RentPaymentReceivedEmailProps) {
  return (
    <Html>
      <head>
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
        <title>Rent Payment Received</title>
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
            background: linear-gradient(135deg, #059669 0%, #047857 100%);
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
          .header-title {
            color: white;
            font-size: 24px;
            font-weight: 600;
            margin: 0;
          }
          .header-subtitle {
            color: rgba(255, 255, 255, 0.9);
            font-size: 16px;
            margin-top: 8px;
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
          .success-icon {
            width: 64px;
            height: 64px;
            background: #d1fae5;
            border-radius: 50%;
            display: flex;
            align-items: center;
            justify-content: center;
            margin: 0 auto 24px;
          }
          .payment-details {
            background-color: #f3f4f6;
            border-radius: 8px;
            padding: 20px;
            margin: 24px 0;
          }
          .detail-row {
            display: flex;
            justify-content: space-between;
            margin-bottom: 12px;
            padding-bottom: 12px;
            border-bottom: 1px solid #e5e7eb;
          }
          .detail-row:last-child {
            margin-bottom: 0;
            padding-bottom: 0;
            border-bottom: none;
          }
          .detail-label {
            font-weight: 500;
            color: #6b7280;
          }
          .detail-value {
            font-weight: 600;
            color: #111827;
            text-align: right;
          }
          .amount {
            font-size: 28px;
            font-weight: 700;
            color: #059669;
          }
          .arrival-box {
            background: linear-gradient(135deg, #dbeafe 0%, #e0e7ff 100%);
            border-radius: 8px;
            padding: 16px 20px;
            margin: 24px 0;
            text-align: center;
          }
          .arrival-label {
            font-size: 14px;
            color: #4b5563;
            margin-bottom: 4px;
          }
          .arrival-date {
            font-size: 18px;
            font-weight: 600;
            color: #1e40af;
          }
          .footer {
            background-color: #f9fafb;
            padding: 24px;
            text-align: center;
            border-top: 1px solid #e5e7eb;
          }
          .footer-text {
            color: #6b7280;
            font-size: 14px;
            margin: 0;
          }
          @media only screen and (max-width: 600px) {
            .container {
              margin: 8px;
              border-radius: 8px;
            }
            .header {
              padding: 24px 16px;
            }
            .content {
              padding: 24px 16px;
            }
            .detail-row {
              flex-direction: column;
              gap: 4px;
            }
            .detail-value {
              text-align: left;
            }
          }
        `}</style>
      </head>
      <body>
        <div className="container">
          <div className="header">
            {logoUrl && (
              <img src={logoUrl} alt="Logo" className="logo" />
            )}
            <h1 className="header-title">Payment Received! 🎉</h1>
            <p className="header-subtitle">Your tenant just paid rent</p>
          </div>

          <div className="content">
            <h2 className="greeting">Hi {landlordName},</h2>
            
            <p style={{ fontSize: '16px', marginBottom: '24px' }}>
              Great news! <strong>{tenantName}</strong> has paid their rent. The payment is being processed and will be deposited directly to your bank account.
            </p>

            <div className="payment-details">
              <div className="detail-row">
                <span className="detail-label">Tenant</span>
                <span className="detail-value">{tenantName}</span>
              </div>
              <div className="detail-row">
                <span className="detail-label">Property</span>
                <span className="detail-value">{propertyName}</span>
              </div>
              {unitNumber && (
                <div className="detail-row">
                  <span className="detail-label">Unit</span>
                  <span className="detail-value">{unitNumber}</span>
                </div>
              )}
              <div className="detail-row">
                <span className="detail-label">Payment Method</span>
                <span className="detail-value">{paymentMethod}</span>
              </div>
              <div className="detail-row">
                <span className="detail-label">Paid On</span>
                <span className="detail-value">{paidAt}</span>
              </div>
              <div className="detail-row">
                <span className="detail-label">Amount</span>
                <span className="detail-value amount">{amount}</span>
              </div>
            </div>

            <div className="arrival-box">
              <p className="arrival-label">Estimated deposit to your bank</p>
              <p className="arrival-date">{estimatedArrival}</p>
            </div>

            <p style={{ fontSize: '14px', color: '#6b7280', textAlign: 'center' }}>
              No action needed - funds will be deposited automatically.
            </p>
          </div>

          <div className="footer">
            <p className="footer-text">
              This is an automated notification from PropertyFlow HQ
            </p>
            <p className="footer-text" style={{ marginTop: '8px' }}>
              © {new Date().getFullYear()} PropertyFlow HQ. All rights reserved.
            </p>
          </div>
        </div>
      </body>
    </Html>
  );
}
