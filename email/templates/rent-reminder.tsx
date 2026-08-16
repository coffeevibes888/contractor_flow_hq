import { Html } from '@react-email/components';
import { Landlord } from '@prisma/client';

interface RentReminderEmailProps {
  tenantName: string;
  propertyName: string;
  unitName: string;
  rentAmount: string;
  dueDate: string;
  landlord: Landlord;
  paymentUrl: string;
}

export default function RentReminderEmail({
  tenantName,
  propertyName,
  unitName,
  rentAmount,
  dueDate,
  landlord,
  paymentUrl,
}: RentReminderEmailProps) {
  const landlordName = landlord.name;
  const logoUrl = landlord.logoUrl;
  const subdomain = landlord.subdomain;
  
  // Build support email based on environment
  const rootDomain = process.env.NEXT_PUBLIC_ROOT_DOMAIN || 'localhost:3000';
  const supportEmail = `support@${subdomain}.${rootDomain}`;

  return (
    <Html>
      <head>
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
        <title>Rent Payment Reminder - {landlordName}</title>
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
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
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
          .content {
            padding: 32px 24px;
          }
          .greeting {
            font-size: 18px;
            font-weight: 600;
            margin-bottom: 16px;
            color: #111827;
          }
          .rent-details {
            background-color: #f3f4f6;
            border-radius: 8px;
            padding: 20px;
            margin: 24px 0;
          }
          .detail-row {
            display: flex;
            justify-content: space-between;
            margin-bottom: 8px;
          }
          .detail-label {
            font-weight: 500;
            color: #6b7280;
          }
          .detail-value {
            font-weight: 600;
            color: #111827;
          }
          .amount {
            font-size: 28px;
            font-weight: 700;
            color: #059669;
          }
          .cta-button {
            display: inline-block;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white;
            text-decoration: none;
            padding: 16px 32px;
            border-radius: 8px;
            font-weight: 600;
            font-size: 16px;
            text-align: center;
            margin: 24px 0;
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
          .help-link {
            color: #667eea;
            text-decoration: none;
            font-weight: 500;
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
            .company-name {
              font-size: 20px;
            }
            .cta-button {
              padding: 14px 24px;
              font-size: 15px;
            }
            .detail-row {
              flex-direction: column;
              gap: 4px;
            }
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
                color: '#667eea',
                fontWeight: 'bold',
                fontSize: '18px'
              }}>
                {landlordName}
              </div>
            )}
            <h1 className="company-name">{landlordName}</h1>
          </div>

          <div className="content">
            <h2 className="greeting">Hi {tenantName},</h2>
            
            <p style={{ fontSize: '16px', marginBottom: '24px' }}>
              This is a friendly reminder that your rent payment for {propertyName} - {unitName} is due on {dueDate}.
            </p>

            <div className="rent-details">
              <div className="detail-row">
                <span className="detail-label">Property:</span>
                <span className="detail-value">{propertyName}</span>
              </div>
              <div className="detail-row">
                <span className="detail-label">Unit:</span>
                <span className="detail-value">{unitName}</span>
              </div>
              <div className="detail-row">
                <span className="detail-label">Due Date:</span>
                <span className="detail-value">{dueDate}</span>
              </div>
              <div className="detail-row" style={{ marginBottom: '0' }}>
                <span className="detail-label">Amount Due:</span>
                <span className="detail-value amount">{rentAmount}</span>
              </div>
            </div>

            <div style={{ textAlign: 'center' }}>
              <a href={paymentUrl} className="cta-button">
                Pay Rent Online
              </a>
            </div>

            <p style={{ fontSize: '14px', color: '#6b7280', textAlign: 'center' }}>
              or visit your tenant portal to make a payment
            </p>
          </div>

          <div className="footer">
            <p className="footer-text">
              Questions? Contact us at{' '}
              <a href={`mailto:${supportEmail}`} className="help-link">
                {supportEmail}
              </a>
            </p>
            <p className="footer-text" style={{ marginTop: '8px' }}>
              © 2024 {landlordName}. All rights reserved.
            </p>
          </div>
        </div>
      </body>
    </Html>
  );
}
