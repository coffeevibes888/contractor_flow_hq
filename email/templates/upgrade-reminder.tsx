import {
  Body,
  Container,
  Head,
  Heading,
  Html,
  Preview,
  Section,
  Text,
  Button,
  Hr,
} from '@react-email/components';

interface UpgradeReminderEmailProps {
  landlordName: string;
  currentTier: string;
  unitCount: number;
  unitLimit: number;
  upgradeTier: string;
  upgradePrice: number;
  upgradeUrl: string;
  isAtLimit: boolean;
}

export default function UpgradeReminderEmail({
  landlordName = 'Property Manager',
  currentTier = 'Free',
  unitCount = 20,
  unitLimit = 24,
  upgradeTier = 'Growth',
  upgradePrice = 29.99,
  upgradeUrl = 'https://app.example.com/admin/settings?tab=subscription',
  isAtLimit = false,
}: UpgradeReminderEmailProps) {
  const percentUsed = Math.round((unitCount / unitLimit) * 100);

  return (
    <Html>
      <Head />
      <Preview>
        {isAtLimit
          ? `You've reached your ${unitLimit} unit limit`
          : `You're using ${percentUsed}% of your unit limit`}
      </Preview>
      <Body style={main}>
        <Container style={container}>
          <Heading style={heading}>
            {isAtLimit ? 'Unit Limit Reached' : 'Approaching Your Unit Limit'}
          </Heading>

          <Text style={text}>Hi {landlordName},</Text>

          {isAtLimit ? (
            <Text style={text}>
              You&apos;ve reached your <strong>{unitLimit} unit limit</strong> on
              the <strong>{currentTier}</strong> plan. To add more properties and
              units, please upgrade to the <strong>{upgradeTier}</strong> plan.
            </Text>
          ) : (
            <Text style={text}>
              You&apos;re currently using <strong>{unitCount}</strong> of your{' '}
              <strong>{unitLimit}</strong> available units on the{' '}
              <strong>{currentTier}</strong> plan ({percentUsed}% capacity).
            </Text>
          )}

          <Section style={progressContainer}>
            <div style={progressBar}>
              <div
                style={{
                  ...progressFill,
                  width: `${Math.min(percentUsed, 100)}%`,
                  backgroundColor: isAtLimit ? '#ef4444' : percentUsed >= 80 ? '#f59e0b' : '#10b981',
                }}
              />
            </div>
            <Text style={progressText}>
              {unitCount} / {unitLimit} units used
            </Text>
          </Section>

          <Section style={upgradeSection}>
            <Heading as="h2" style={subheading}>
              Upgrade to {upgradeTier} - ${upgradePrice}/month
            </Heading>
            <Text style={featureText}>Benefits include:</Text>
            <ul style={featureList}>
              <li>More units for your growing portfolio</li>
              <li>Free background & eviction checks</li>
              <li>Free employment verification</li>
              <li>Priority support</li>
            </ul>
            <Button href={upgradeUrl} style={button}>
              Upgrade Now
            </Button>
          </Section>

          <Hr style={hr} />

          <Text style={footerText}>
            If you have any questions about upgrading, please contact our support
            team. We&apos;re here to help you grow your business with Property Flow HQ.
          </Text>
        </Container>
      </Body>
    </Html>
  );
}

const main = {
  backgroundColor: '#f6f9fc',
  fontFamily:
    '-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,"Helvetica Neue",Ubuntu,sans-serif',
};

const container = {
  backgroundColor: '#ffffff',
  margin: '0 auto',
  padding: '40px 20px',
  marginBottom: '64px',
  maxWidth: '600px',
  borderRadius: '8px',
};

const heading = {
  fontSize: '24px',
  letterSpacing: '-0.5px',
  lineHeight: '1.3',
  fontWeight: '700',
  color: '#1a1a1a',
  padding: '17px 0 0',
};

const subheading = {
  fontSize: '18px',
  fontWeight: '600',
  color: '#1a1a1a',
  marginBottom: '12px',
};

const text = {
  fontSize: '15px',
  lineHeight: '1.6',
  color: '#3c4149',
};

const progressContainer = {
  margin: '24px 0',
};

const progressBar = {
  width: '100%',
  height: '12px',
  backgroundColor: '#e5e7eb',
  borderRadius: '6px',
  overflow: 'hidden',
};

const progressFill = {
  height: '100%',
  borderRadius: '6px',
  transition: 'width 0.3s ease',
};

const progressText = {
  fontSize: '13px',
  color: '#6b7280',
  marginTop: '8px',
  textAlign: 'center' as const,
};

const upgradeSection = {
  backgroundColor: '#f3f4f6',
  padding: '24px',
  borderRadius: '8px',
  margin: '24px 0',
};

const featureText = {
  fontSize: '14px',
  color: '#4b5563',
  marginBottom: '8px',
};

const featureList = {
  fontSize: '14px',
  color: '#4b5563',
  paddingLeft: '20px',
  margin: '0 0 16px 0',
};

const button = {
  backgroundColor: '#7c3aed',
  borderRadius: '6px',
  color: '#fff',
  fontSize: '15px',
  fontWeight: '600',
  textDecoration: 'none',
  textAlign: 'center' as const,
  display: 'block',
  padding: '12px 24px',
};

const hr = {
  borderColor: '#e6ebf1',
  margin: '20px 0',
};

const footerText = {
  fontSize: '13px',
  color: '#8898aa',
  lineHeight: '1.5',
};
