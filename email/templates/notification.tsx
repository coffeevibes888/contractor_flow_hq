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

interface NotificationEmailProps {
  landlord: {
    name: string;
    logoUrl?: string;
    subdomain: string;
  };
  recipientName: string;
  notificationType: 'application' | 'message' | 'maintenance' | 'payment' | 'reminder';
  title: string;
  message: string;
  actionUrl?: string;
  loginUrl: string;
}

const getNotificationColors = (type: string) => {
  switch (type) {
    case 'application':
      return {
        primary: '#2563eb',
        secondary: '#dbeafe',
        icon: '📋',
      };
    case 'payment':
      return {
        primary: '#059669',
        secondary: '#d1fae5',
        icon: '💳',
      };
    case 'maintenance':
      return {
        primary: '#d97706',
        secondary: '#fed7aa',
        icon: '🔧',
      };
    case 'reminder':
      return {
        primary: '#7c3aed',
        secondary: '#e9d5ff',
        icon: '🔔',
      };
    default:
      return {
        primary: '#374151',
        secondary: '#f3f4f6',
        icon: '📬',
      };
  }
};

export default function NotificationEmail({
  landlord,
  recipientName,
  notificationType,
  title,
  message,
  actionUrl,
  loginUrl,
}: NotificationEmailProps) {
  const colors = getNotificationColors(notificationType);
  const rootDomain = process.env.NEXT_PUBLIC_ROOT_DOMAIN || 'localhost:3000';
  // For emails, use https in production, http for localhost
  const protocol = rootDomain.includes('localhost') ? 'http' : 'https';
  const landlordUrl = `${protocol}://${landlord.subdomain}.${rootDomain}`;

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
      <Preview>{title}</Preview>
      <Body style={{ backgroundColor: '#f8fafc', fontFamily: 'Inter, Arial, sans-serif' }}>
        <Container style={{ maxWidth: '600px', margin: '0 auto', padding: '20px' }}>
          {/* Header */}
          <Section style={{ textAlign: 'center', marginBottom: '30px' }}>
            {landlord.logoUrl ? (
              <Img
                src={landlord.logoUrl}
                alt={`${landlord.name} logo`}
                style={{ width: '120px', height: 'auto', marginBottom: '10px' }}
              />
            ) : (
              <div
                style={{
                  width: '60px',
                  height: '60px',
                  backgroundColor: colors.primary,
                  borderRadius: '12px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  margin: '0 auto 10px',
                  fontSize: '24px',
                }}
              >
                {colors.icon}
              </div>
            )}
            <Heading style={{ fontSize: '24px', fontWeight: '600', color: '#1e293b', margin: '0' }}>
              {landlord.name}
            </Heading>
            <Text style={{ fontSize: '14px', color: '#64748b', margin: '5px 0 0' }}>
              Property Flow HQ
            </Text>
          </Section>

          {/* Notification Card */}
          <Section
            style={{
              backgroundColor: '#ffffff',
              borderRadius: '16px',
              padding: '30px',
              boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)',
              marginBottom: '20px',
            }}
          >
            {/* Notification Type Badge */}
            <div
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                backgroundColor: colors.secondary,
                color: colors.primary,
                padding: '6px 12px',
                borderRadius: '20px',
                fontSize: '12px',
                fontWeight: '500',
                marginBottom: '20px',
                textTransform: 'capitalize',
              }}
            >
              <span style={{ marginRight: '6px' }}>{colors.icon}</span>
              {notificationType} Update
            </div>

            {/* Title */}
            <Heading style={{ fontSize: '20px', fontWeight: '600', color: '#1e293b', marginBottom: '16px' }}>
              {title}
            </Heading>

            {/* Message */}
            <Text style={{ fontSize: '16px', color: '#475569', lineHeight: '1.6', marginBottom: '24px' }}>
              {message}
            </Text>

            {/* Action Button */}
            <div style={{ textAlign: 'center', marginBottom: '20px' }}>
              <Button
                href={actionUrl || loginUrl}
                style={{
                  backgroundColor: colors.primary,
                  color: '#ffffff',
                  padding: '12px 24px',
                  borderRadius: '8px',
                  textDecoration: 'none',
                  fontWeight: '500',
                  display: 'inline-block',
                }}
              >
                {notificationType === 'payment' ? 'Manage Payment' : 
                 notificationType === 'application' ? 'View Application' :
                 notificationType === 'maintenance' ? 'View Request' :
                 'View Details'}
              </Button>
            </div>

            {/* Security Note */}
            <Text style={{ fontSize: '12px', color: '#94a3b8', textAlign: 'center', margin: '20px 0 0' }}>
              This is a secure notification from {landlord.name}. If you didn't expect this message, 
              please contact support.
            </Text>
          </Section>

          {/* Quick Links */}
          <Section style={{ backgroundColor: '#ffffff', borderRadius: '16px', padding: '20px', marginBottom: '20px' }}>
            <Text style={{ fontSize: '14px', fontWeight: '600', color: '#1e293b', marginBottom: '12px' }}>
              Quick Links
            </Text>
            <div style={{ display: 'flex', justifyContent: 'space-between', gap: '10px' }}>
              <Link
                href={loginUrl}
                style={{
                  fontSize: '12px',
                  color: colors.primary,
                  textDecoration: 'none',
                  flex: 1,
                  textAlign: 'center',
                  padding: '8px',
                  border: `1px solid ${colors.secondary}`,
                  borderRadius: '6px',
                }}
              >
                Sign In
              </Link>
              <Link
                href={`${landlordUrl}/user`}
                style={{
                  fontSize: '12px',
                  color: colors.primary,
                  textDecoration: 'none',
                  flex: 1,
                  textAlign: 'center',
                  padding: '8px',
                  border: `1px solid ${colors.secondary}`,
                  borderRadius: '6px',
                }}
              >
                Dashboard
              </Link>
              <Link
                href={`${landlordUrl}/user/notifications`}
                style={{
                  fontSize: '12px',
                  color: colors.primary,
                  textDecoration: 'none',
                  flex: 1,
                  textAlign: 'center',
                  padding: '8px',
                  border: `1px solid ${colors.secondary}`,
                  borderRadius: '6px',
                }}
              >
                Notifications
              </Link>
            </div>
          </Section>

          {/* Footer */}
          <Hr style={{ borderColor: '#e2e8f0', margin: '30px 0' }} />
          <Section style={{ textAlign: 'center' }}>
            <Text style={{ fontSize: '12px', color: '#64748b', marginBottom: '8px' }}>
              You're receiving this email because you're a tenant or customer of {landlord.name}.
            </Text>
            <Text style={{ fontSize: '12px', color: '#64748b' }}>
              © 2024 {landlord.name}. All rights reserved.
            </Text>
            <div style={{ marginTop: '12px' }}>
              <Link
                href={`${landlordUrl}/user/profile`}
                style={{ fontSize: '12px', color: colors.primary, textDecoration: 'none', marginRight: '16px' }}
              >
                Profile Settings
              </Link>
              <Link
                href={`${landlordUrl}/user`}
                style={{ fontSize: '12px', color: colors.primary, textDecoration: 'none' }}
              >
                Dashboard
              </Link>
            </div>
          </Section>
        </Container>
      </Body>
    </Html>
  );
}
