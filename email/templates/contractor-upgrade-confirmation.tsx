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
  Font,
} from '@react-email/components';

interface ContractorUpgradeConfirmationEmailProps {
  contractorName: string;
  previousTier: string;
  newTier: string;
  newTierPrice: number;
  billingPeriod: 'monthly' | 'annual';
  effectiveDate: string;
  dashboardUrl: string;
}

export default function ContractorUpgradeConfirmationEmail({
  contractorName = 'Contractor',
  previousTier = 'Starter',
  newTier = 'Pro',
  newTierPrice = 99,
  billingPeriod = 'monthly',
  effectiveDate = new Date().toLocaleDateString('en-US', { 
    year: 'numeric', 
    month: 'long', 
    day: 'numeric' 
  }),
  dashboardUrl = 'https://app.example.com/contractor/dashboard',
}: ContractorUpgradeConfirmationEmailProps) {
  const getNewFeatures = () => {
    if (newTier === 'Pro') {
      return [
        { name: 'Active Jobs', value: 'Up to 50 per month' },
        { name: 'Invoicing', value: 'Unlimited' },
        { name: 'Customers', value: 'Up to 500' },
        { name: 'Team Members', value: 'Up to 6' },
        { name: 'CRM Features', value: 'Full access' },
        { name: 'Lead Management', value: '100 active leads' },
        { name: 'Inventory', value: '200 items' },
        { name: 'Equipment', value: '20 items' },
        { name: 'Support', value: 'Priority email & phone' },
      ];
    } else if (newTier === 'Enterprise') {
      return [
        { name: 'Active Jobs', value: 'Unlimited' },
        { name: 'Customers', value: 'Unlimited' },
        { name: 'Team Members', value: 'Unlimited' },
        { name: 'Inventory & Equipment', value: 'Unlimited' },
        { name: 'Lead Management', value: 'Unlimited with automation' },
        { name: 'Marketing Suite', value: 'Email & SMS campaigns' },
        { name: 'Advanced Analytics', value: 'Custom dashboards' },
        { name: 'API Access', value: 'Full API & webhooks' },
        { name: 'Support', value: '24/7 priority + account manager' },
      ];
    }
    return [];
  };

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
      <Preview>
        Welcome to {newTier}! Your upgrade is complete
      </Preview>
      <Body style={{ backgroundColor: '#f8fafc', fontFamily: 'Inter, Arial, sans-serif' }}>
        <Container style={{ maxWidth: '600px', margin: '0 auto', padding: '20px' }}>
          {/* Header */}
          <Section style={{ textAlign: 'center', marginBottom: '30px' }}>
            <div
              style={{
                width: '60px',
                height: '60px',
                backgroundColor: '#10b981',
                borderRadius: '12px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                margin: '0 auto 10px',
                fontSize: '24px',
              }}
            >
              🎉
            </div>
            <Heading style={{ fontSize: '24px', fontWeight: '600', color: '#1e293b', margin: '0' }}>
              Upgrade Successful!
            </Heading>
            <Text style={{ fontSize: '14px', color: '#64748b', margin: '5px 0 0' }}>
              Property Flow HQ
            </Text>
          </Section>

          {/* Main Content Card */}
          <Section
            style={{
              backgroundColor: '#ffffff',
              borderRadius: '16px',
              padding: '30px',
              boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)',
              marginBottom: '20px',
            }}
          >
            {/* Success Badge */}
            <div
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                backgroundColor: '#d1fae5',
                color: '#059669',
                padding: '6px 12px',
                borderRadius: '20px',
                fontSize: '12px',
                fontWeight: '500',
                marginBottom: '20px',
              }}
            >
              <span style={{ marginRight: '6px' }}>✅</span>
              Upgrade Complete
            </div>

            {/* Greeting */}
            <Text style={{ fontSize: '16px', color: '#475569', lineHeight: '1.6', marginBottom: '16px' }}>
              Hi {contractorName},
            </Text>

            {/* Main Message */}
            <Text style={{ fontSize: '16px', color: '#475569', lineHeight: '1.6', marginBottom: '24px' }}>
              Congratulations! You've successfully upgraded from <strong>{previousTier}</strong> to{' '}
              <strong>{newTier}</strong>. All your new features are now active and ready to use.
            </Text>

            {/* Upgrade Summary */}
            <div
              style={{
                backgroundColor: '#f9fafb',
                padding: '20px',
                borderRadius: '8px',
                marginBottom: '24px',
              }}
            >
              <Heading
                as="h2"
                style={{ fontSize: '18px', fontWeight: '600', color: '#1e293b', marginBottom: '16px' }}
              >
                Upgrade Summary
              </Heading>
              <table style={{ width: '100%', fontSize: '14px', color: '#475569' }}>
                <tbody>
                  <tr>
                    <td style={{ paddingBottom: '8px' }}>Previous Plan:</td>
                    <td style={{ paddingBottom: '8px', textAlign: 'right', fontWeight: '600' }}>{previousTier}</td>
                  </tr>
                  <tr>
                    <td style={{ paddingBottom: '8px' }}>New Plan:</td>
                    <td style={{ paddingBottom: '8px', textAlign: 'right', fontWeight: '600' }}>{newTier}</td>
                  </tr>
                  <tr>
                    <td style={{ paddingBottom: '8px' }}>Price:</td>
                    <td style={{ paddingBottom: '8px', textAlign: 'right', fontWeight: '600' }}>
                      ${newTierPrice}/{billingPeriod === 'annual' ? 'year' : 'month'}
                    </td>
                  </tr>
                  <tr>
                    <td style={{ paddingBottom: '8px' }}>Effective Date:</td>
                    <td style={{ paddingBottom: '8px', textAlign: 'right', fontWeight: '600' }}>{effectiveDate}</td>
                  </tr>
                </tbody>
              </table>
            </div>

            {/* New Features */}
            <div
              style={{
                backgroundColor: '#f0fdf4',
                padding: '20px',
                borderRadius: '8px',
                marginBottom: '24px',
                border: '1px solid #86efac',
              }}
            >
              <Heading
                as="h2"
                style={{ fontSize: '18px', fontWeight: '600', color: '#1e293b', marginBottom: '16px' }}
              >
                Your New Features
              </Heading>
              <table style={{ width: '100%', fontSize: '14px', color: '#475569' }}>
                <tbody>
                  {getNewFeatures().map((feature, index) => (
                    <tr key={index}>
                      <td style={{ paddingBottom: '8px', paddingRight: '16px' }}>
                        <span style={{ marginRight: '8px' }}>✓</span>
                        {feature.name}
                      </td>
                      <td style={{ paddingBottom: '8px', textAlign: 'right', fontWeight: '500', color: '#059669' }}>
                        {feature.value}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Next Steps */}
            <div
              style={{
                backgroundColor: '#eff6ff',
                padding: '20px',
                borderRadius: '8px',
                marginBottom: '24px',
              }}
            >
              <Heading
                as="h2"
                style={{ fontSize: '18px', fontWeight: '600', color: '#1e293b', marginBottom: '12px' }}
              >
                Get Started
              </Heading>
              <Text style={{ fontSize: '14px', color: '#4b5563', marginBottom: '12px' }}>
                Here are some things you can do now:
              </Text>
              <ul style={{ fontSize: '14px', color: '#4b5563', paddingLeft: '20px', margin: '0' }}>
                {newTier === 'Pro' && (
                  <>
                    <li style={{ marginBottom: '8px' }}>Invite your team members</li>
                    <li style={{ marginBottom: '8px' }}>Set up your CRM and import customers</li>
                    <li style={{ marginBottom: '8px' }}>Create lead tracking pipelines</li>
                    <li style={{ marginBottom: '8px' }}>Add inventory and equipment</li>
                  </>
                )}
                {newTier === 'Enterprise' && (
                  <>
                    <li style={{ marginBottom: '8px' }}>Build your unlimited team</li>
                    <li style={{ marginBottom: '8px' }}>Set up marketing campaigns</li>
                    <li style={{ marginBottom: '8px' }}>Configure API integrations</li>
                    <li style={{ marginBottom: '8px' }}>Explore advanced analytics</li>
                    <li style={{ marginBottom: '8px' }}>Contact your account manager</li>
                  </>
                )}
              </ul>
            </div>

            {/* Action Button */}
            <div style={{ textAlign: 'center', marginBottom: '20px' }}>
              <Button
                href={dashboardUrl}
                style={{
                  backgroundColor: '#7c3aed',
                  color: '#ffffff',
                  padding: '14px 32px',
                  borderRadius: '8px',
                  textDecoration: 'none',
                  fontWeight: '600',
                  display: 'inline-block',
                  fontSize: '16px',
                }}
              >
                Go to Dashboard
              </Button>
            </div>

            {/* Help Text */}
            <Text style={{ fontSize: '12px', color: '#94a3b8', textAlign: 'center', margin: '20px 0 0' }}>
              Need help getting started? Our support team is ready to assist you.
            </Text>
          </Section>

          {/* Footer */}
          <Hr style={{ borderColor: '#e2e8f0', margin: '30px 0' }} />
          <Section style={{ textAlign: 'center' }}>
            <Text style={{ fontSize: '12px', color: '#64748b', marginBottom: '8px' }}>
              Thank you for upgrading! We're excited to help you grow your business.
            </Text>
            <Text style={{ fontSize: '12px', color: '#64748b' }}>
              © 2024 Property Flow HQ. All rights reserved.
            </Text>
          </Section>
        </Container>
      </Body>
    </Html>
  );
}
