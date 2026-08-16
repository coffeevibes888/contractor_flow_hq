import {
  Body,
  Container,
  Head,
  Heading,
  Html,
  Img,
  Link,
  Preview,
  Section,
  Text,
  Button,
  Hr,
  Font,
} from '@react-email/components';

interface VerificationReminderEmailProps {
  contractorName: string;
  verificationType: 'license' | 'insurance' | 'background_check';
  expirationDate: string;
  daysUntilExpiration: number;
  actionUrl: string;
}

const getVerificationInfo = (type: string) => {
  switch (type) {
    case 'license':
      return {
        title: 'License Expiring Soon',
        icon: '🏅',
        color: '#2563eb',
        secondary: '#dbeafe',
        message: 'Your professional license verification is expiring soon.',
      };
    case 'insurance':
      return {
        title: 'Insurance Certificate Expiring Soon',
        icon: '🛡️',
        color: '#059669',
        secondary: '#d1fae5',
        message: 'Your insurance certificate is expiring soon.',
      };
    case 'background_check':
      return {
        title: 'Background Check Expiring Soon',
        icon: '✓',
        color: '#7c3aed',
        secondary: '#e9d5ff',
        message: 'Your background check verification is expiring soon.',
      };
    default:
      return {
        title: 'Verification Expiring Soon',
        icon: '⚠️',
        color: '#d97706',
        secondary: '#fed7aa',
        message: 'Your verification is expiring soon.',
      };
  }
};

export default function VerificationReminderEmail({
  contractorName,
  verificationType,
  expirationDate,
  daysUntilExpiration,
  actionUrl,
}: VerificationReminderEmailProps) {
  const info = getVerificationInfo(verificationType);
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';

  return (
    <Html>
      <Head>
        <Font
          fontFamily="Inter"
          fallbackFontFamily="Arial"
          webFont={{
            url: 'https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap',
            format: 'woff2',
          }}
          fontWeight={400}
          fontStyle="normal"
        />
      </Head>
      <Preview>{info.title} - Action Required</Preview>
      <Body style={{ backgroundColor: '#f8fafc', fontFamily: 'Inter, Arial, sans-serif' }}>
        <Container style={{ maxWidth: '600px', margin: '0 auto', padding: '20px' }}>
          {/* Header */}
          <Section style={{ textAlign: 'center', marginBottom: '30px' }}>
            <div
              style={{
                width: '60px',
                height: '60px',
                backgroundColor: info.color,
                borderRadius: '12px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                margin: '0 auto 10px',
                fontSize: '24px',
              }}
            >
              {info.icon}
            </div>
            <Heading style={{ fontSize: '24px', fontWeight: '600', color: '#1e293b', margin: '0' }}>
              PropertyFlow Contractor Marketplace
            </Heading>
            <Text style={{ fontSize: '14px', color: '#64748b', margin: '5px 0 0' }}>
              Verification Reminder
            </Text>
          </Section>

          {/* Alert Card */}
          <Section
            style={{
              backgroundColor: '#ffffff',
              borderRadius: '16px',
              padding: '30px',
              boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)',
              marginBottom: '20px',
            }}
          >
            {/* Alert Badge */}
            <div
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                backgroundColor: info.secondary,
                color: info.color,
                padding: '6px 12px',
                borderRadius: '20px',
                fontSize: '12px',
                fontWeight: '500',
                marginBottom: '20px',
              }}
            >
              <span style={{ marginRight: '6px' }}>{info.icon}</span>
              Action Required
            </div>

            {/* Greeting */}
            <Text style={{ fontSize: '16px', color: '#475569', marginBottom: '16px' }}>
              Hi {contractorName},
            </Text>

            {/* Main Message */}
            <Heading style={{ fontSize: '20px', fontWeight: '600', color: '#1e293b', marginBottom: '16px' }}>
              {info.title}
            </Heading>

            <Text style={{ fontSize: '16px', color: '#475569', lineHeight: '1.6', marginBottom: '16px' }}>
              {info.message}
            </Text>

            {/* Expiration Details */}
            <div
              style={{
                backgroundColor: '#fef3c7',
                border: '1px solid #fbbf24',
                borderRadius: '8px',
                padding: '16px',
                marginBottom: '24px',
              }}
            >
              <Text style={{ fontSize: '14px', color: '#92400e', margin: '0 0 8px', fontWeight: '600' }}>
                ⚠️ Expiration Details
              </Text>
              <Text style={{ fontSize: '14px', color: '#92400e', margin: '0' }}>
                <strong>Expires on:</strong> {expirationDate}
                <br />
                <strong>Days remaining:</strong> {daysUntilExpiration} days
              </Text>
            </div>

            <Text style={{ fontSize: '16px', color: '#475569', lineHeight: '1.6', marginBottom: '24px' }}>
              To maintain your verified status and continue receiving leads, please renew your{' '}
              {verificationType === 'license'
                ? 'license'
                : verificationType === 'insurance'
                ? 'insurance certificate'
                : 'background check'}{' '}
              before it expires.
            </Text>

            {/* Action Button */}
            <div style={{ textAlign: 'center', marginBottom: '20px' }}>
              <Button
                href={actionUrl}
                style={{
                  backgroundColor: info.color,
                  color: '#ffffff',
                  padding: '12px 24px',
                  borderRadius: '8px',
                  textDecoration: 'none',
                  fontWeight: '500',
                  display: 'inline-block',
                }}
              >
                Update Verification
              </Button>
            </div>

            {/* Why This Matters */}
            <div
              style={{
                backgroundColor: '#f1f5f9',
                borderRadius: '8px',
                padding: '16px',
                marginTop: '20px',
              }}
            >
              <Text style={{ fontSize: '14px', fontWeight: '600', color: '#1e293b', margin: '0 0 8px' }}>
                Why this matters:
              </Text>
              <Text style={{ fontSize: '14px', color: '#475569', margin: '0', lineHeight: '1.6' }}>
                • Your verification badge will be removed if expired
                <br />
                • You'll appear lower in search results
                <br />
                • Customers prefer verified contractors
                <br />• Maintaining verification builds trust and increases bookings
              </Text>
            </div>
          </Section>

          {/* Quick Links */}
          <Section style={{ backgroundColor: '#ffffff', borderRadius: '16px', padding: '20px', marginBottom: '20px' }}>
            <Text style={{ fontSize: '14px', fontWeight: '600', color: '#1e293b', marginBottom: '12px' }}>
              Quick Links
            </Text>
            <div style={{ display: 'flex', justifyContent: 'space-between', gap: '10px' }}>
              <Link
                href={`${appUrl}/contractor/dashboard`}
                style={{
                  fontSize: '12px',
                  color: info.color,
                  textDecoration: 'none',
                  flex: 1,
                  textAlign: 'center',
                  padding: '8px',
                  border: `1px solid ${info.secondary}`,
                  borderRadius: '6px',
                }}
              >
                Dashboard
              </Link>
              <Link
                href={`${appUrl}/contractor/settings/verification`}
                style={{
                  fontSize: '12px',
                  color: info.color,
                  textDecoration: 'none',
                  flex: 1,
                  textAlign: 'center',
                  padding: '8px',
                  border: `1px solid ${info.secondary}`,
                  borderRadius: '6px',
                }}
              >
                Verification Settings
              </Link>
            </div>
          </Section>

          {/* Footer */}
          <Hr style={{ borderColor: '#e2e8f0', margin: '30px 0' }} />
          <Section style={{ textAlign: 'center' }}>
            <Text style={{ fontSize: '12px', color: '#64748b', marginBottom: '8px' }}>
              You're receiving this email because you're a contractor on PropertyFlow.
            </Text>
            <Text style={{ fontSize: '12px', color: '#64748b' }}>
              © 2024 PropertyFlow. All rights reserved.
            </Text>
            <div style={{ marginTop: '12px' }}>
              <Link
                href={`${appUrl}/contractor/settings`}
                style={{ fontSize: '12px', color: info.color, textDecoration: 'none', marginRight: '16px' }}
              >
                Settings
              </Link>
              <Link
                href={`${appUrl}/faq`}
                style={{ fontSize: '12px', color: info.color, textDecoration: 'none' }}
              >
                Help Center
              </Link>
            </div>
          </Section>
        </Container>
      </Body>
    </Html>
  );
}
