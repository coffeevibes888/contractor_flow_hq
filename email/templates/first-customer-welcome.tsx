import { Html } from '@react-email/components';

interface FirstCustomerWelcomeProps {
  recipientName: string;
  verificationUrl: string;
  billingUrl: string;
  couponCode: string;
  couponPercentOff: number;
  couponDurationMonths: number;
  trialEndsAt: string;
  founderName?: string;
  supportEmail?: string;
}

/**
 * One-off welcome email for the first real customer. Intentionally warm and
 * personal — not a templated blast.
 */
export default function FirstCustomerWelcomeEmail({
  recipientName,
  verificationUrl,
  billingUrl,
  couponCode,
  couponPercentOff,
  couponDurationMonths,
  trialEndsAt,
  founderName = 'The Property Flow HQ team',
  supportEmail = 'support@propertyflowhq.com',
}: FirstCustomerWelcomeProps) {
  return (
    <Html>
      <head>
        <meta name='viewport' content='width=device-width, initial-scale=1.0' />
        <title>Welcome to Property Flow HQ</title>
      </head>
      <body
        style={{
          fontFamily:
            "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif",
          lineHeight: 1.6,
          color: '#111827',
          margin: 0,
          padding: 0,
          backgroundColor: '#f3f4f6',
        }}
      >
        <table
          role='presentation'
          cellPadding={0}
          cellSpacing={0}
          width='100%'
          style={{ backgroundColor: '#f3f4f6', padding: '24px 0' }}
        >
          <tr>
            <td align='center'>
              <table
                role='presentation'
                cellPadding={0}
                cellSpacing={0}
                width='600'
                style={{
                  maxWidth: '600px',
                  width: '100%',
                  backgroundColor: '#ffffff',
                  borderRadius: '12px',
                  boxShadow: '0 4px 6px -1px rgba(0,0,0,0.08)',
                  overflow: 'hidden',
                }}
              >
                <tr>
                  <td
                    style={{
                      background:
                        'linear-gradient(135deg, #4f46e5 0%, #0ea5e9 100%)',
                      padding: '32px 32px 24px 32px',
                      color: '#fff',
                    }}
                  >
                    <p
                      style={{
                        margin: 0,
                        fontSize: '12px',
                        letterSpacing: '0.08em',
                        textTransform: 'uppercase',
                        opacity: 0.85,
                      }}
                    >
                      You're our first real customer
                    </p>
                    <h1
                      style={{
                        margin: '6px 0 0 0',
                        fontSize: '26px',
                        lineHeight: 1.2,
                      }}
                    >
                      Welcome aboard, {recipientName.split(' ')[0]}.
                    </h1>
                  </td>
                </tr>

                <tr>
                  <td style={{ padding: '28px 32px 8px 32px' }}>
                    <p style={{ margin: 0, fontSize: '15px' }}>
                      You signed up during our launch window and ran into a
                      rough spot in the onboarding flow. That's on us, and
                      it's already fixed. To thank you for sticking around,
                      here is what we'd like to do:
                    </p>

                    <ul
                      style={{
                        margin: '18px 0 8px 0',
                        padding: '0 0 0 20px',
                        fontSize: '15px',
                      }}
                    >
                      <li style={{ marginBottom: '8px' }}>
                        Your trial has been <strong>extended to 30 days</strong>
                        , ending <strong>{trialEndsAt}</strong>.
                      </li>
                      <li style={{ marginBottom: '8px' }}>
                        When you're ready to subscribe, a coupon for{' '}
                        <strong>
                          {couponPercentOff}% off your first{' '}
                          {couponDurationMonths} months
                        </strong>{' '}
                        on any plan is waiting on your account.
                      </li>
                      <li style={{ marginBottom: '8px' }}>
                        You get a direct line to us for anything you run into.
                      </li>
                    </ul>
                  </td>
                </tr>

                <tr>
                  <td style={{ padding: '12px 32px 0 32px' }}>
                    <div
                      style={{
                        background: '#fef3c7',
                        border: '1px solid #fcd34d',
                        borderRadius: '8px',
                        padding: '14px 16px',
                      }}
                    >
                      <p
                        style={{
                          margin: 0,
                          fontSize: '13px',
                          color: '#78350f',
                          textTransform: 'uppercase',
                          letterSpacing: '0.05em',
                          fontWeight: 600,
                        }}
                      >
                        First — verify your email
                      </p>
                      <p
                        style={{
                          margin: '6px 0 12px 0',
                          fontSize: '14px',
                          color: '#78350f',
                        }}
                      >
                        We now require email verification before landlord
                        dashboard access. This protects your account and the
                        tenants you onboard.
                      </p>
                      <a
                        href={verificationUrl}
                        style={{
                          display: 'inline-block',
                          padding: '10px 18px',
                          backgroundColor: '#111827',
                          color: '#ffffff',
                          textDecoration: 'none',
                          borderRadius: '8px',
                          fontWeight: 600,
                          fontSize: '14px',
                        }}
                      >
                        Verify my email
                      </a>
                    </div>
                  </td>
                </tr>

                <tr>
                  <td style={{ padding: '22px 32px 0 32px' }}>
                    <p
                      style={{
                        margin: '0 0 10px 0',
                        fontSize: '14px',
                        textTransform: 'uppercase',
                        letterSpacing: '0.05em',
                        color: '#6b7280',
                        fontWeight: 600,
                      }}
                    >
                      Your coupon
                    </p>
                    <div
                      style={{
                        border: '1px dashed #6366f1',
                        backgroundColor: '#eef2ff',
                        borderRadius: '10px',
                        padding: '18px',
                        textAlign: 'center',
                      }}
                    >
                      <p
                        style={{
                          margin: 0,
                          fontFamily:
                            "ui-monospace, SFMono-Regular, Menlo, monospace",
                          fontSize: '22px',
                          letterSpacing: '0.1em',
                          color: '#3730a3',
                          fontWeight: 700,
                        }}
                      >
                        {couponCode}
                      </p>
                      <p
                        style={{
                          margin: '4px 0 0 0',
                          fontSize: '13px',
                          color: '#4338ca',
                        }}
                      >
                        {couponPercentOff}% off for{' '}
                        {couponDurationMonths} months on any plan.
                      </p>
                    </div>
                  </td>
                </tr>

                <tr>
                  <td style={{ padding: '22px 32px 0 32px' }}>
                    <a
                      href={billingUrl}
                      style={{
                        display: 'inline-block',
                        padding: '12px 22px',
                        background:
                          'linear-gradient(135deg, #4f46e5 0%, #0ea5e9 100%)',
                        color: '#ffffff',
                        textDecoration: 'none',
                        borderRadius: '10px',
                        fontWeight: 600,
                        fontSize: '15px',
                      }}
                    >
                      Pick a plan and add your card
                    </a>
                  </td>
                </tr>

                <tr>
                  <td style={{ padding: '24px 32px 32px 32px' }}>
                    <p style={{ margin: '0 0 8px 0', fontSize: '14px' }}>
                      If you have feedback about the signup or anything else,
                      reply to this email and it will come straight to me.
                      Getting this right for you matters.
                    </p>
                    <p style={{ margin: '18px 0 0 0', fontSize: '14px' }}>
                      — {founderName}
                    </p>
                    <p
                      style={{
                        margin: '18px 0 0 0',
                        fontSize: '12px',
                        color: '#9ca3af',
                      }}
                    >
                      Questions? Reach us at{' '}
                      <a
                        href={`mailto:${supportEmail}`}
                        style={{ color: '#4f46e5' }}
                      >
                        {supportEmail}
                      </a>
                      .
                    </p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
        </table>
      </body>
    </Html>
  );
}
