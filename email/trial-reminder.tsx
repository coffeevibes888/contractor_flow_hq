import {
  Body,
  Button,
  Container,
  Head,
  Heading,
  Html,
  Img,
  Link,
  Preview,
  Section,
  Text,
} from '@react-email/components';

interface TrialReminderEmailProps {
  name: string;
  daysLeft: number;
  subscriptionUrl: string;
  role: 'landlord' | 'contractor' | 'agent';
}

export default function TrialReminderEmail({
  name,
  daysLeft,
  subscriptionUrl,
  role,
}: TrialReminderEmailProps) {
  const roleLabel = role === 'landlord' ? 'Property Management' : role === 'contractor' ? 'Contractor' : 'Real Estate Agent';
  
  return (
    <Html>
      <Head />
      <Preview>
        {daysLeft > 0 
          ? `${daysLeft} days left in your free trial`
          : 'Your trial has ended'}
      </Preview>
      <Body style={main}>
        <Container style={container}>
          <Heading style={h1}>Property Flow HQ</Heading>
          
          <Text style={text}>Hi {name},</Text>
          
          {daysLeft > 0 ? (
            <>
              <Text style={text}>
                You have <strong>{daysLeft} {daysLeft === 1 ? 'day' : 'days'} left</strong> in your free trial of Property Flow HQ {roleLabel}.
              </Text>
              
              {daysLeft <= 3 && (
                <Text style={urgentText}>
                  ⏰ Time is running out! Subscribe now to keep all your data and continue managing your {role === 'landlord' ? 'properties' : role === 'contractor' ? 'jobs' : 'listings'}.
                </Text>
              )}
              
              <Text style={text}>
                Don't lose access to:
              </Text>
              
              <ul style={list}>
                {role === 'landlord' && (
                  <>
                    <li>Your property listings</li>
                    <li>Tenant information</li>
                    <li>Rent collection</li>
                    <li>Maintenance tracking</li>
                    <li>Lease management</li>
                  </>
                )}
                {role === 'contractor' && (
                  <>
                    <li>Your job pipeline</li>
                    <li>Customer information</li>
                    <li>Invoicing & payments</li>
                    <li>Team management</li>
                    <li>Time tracking</li>
                  </>
                )}
                {role === 'agent' && (
                  <>
                    <li>Your listings</li>
                    <li>Lead management</li>
                    <li>Open house scheduling</li>
                    <li>Client information</li>
                    <li>Marketing tools</li>
                  </>
                )}
              </ul>
            </>
          ) : (
            <>
              <Text style={text}>
                Your free trial has ended. Your account is now in <strong>read-only mode</strong>.
              </Text>
              
              <Text style={urgentText}>
                Subscribe now to restore full access and continue managing your {role === 'landlord' ? 'properties' : role === 'contractor' ? 'business' : 'listings'}.
              </Text>
            </>
          )}
          
          <Section style={buttonContainer}>
            <Button style={button} href={subscriptionUrl}>
              Subscribe Now
            </Button>
          </Section>
          
          <Text style={text}>
            Plans start at just $39/month. Cancel anytime.
          </Text>
          
          <Text style={footer}>
            Questions? Reply to this email or visit our{' '}
            <Link href="https://www.propertyflowhq.com/faq" style={link}>
              FAQ page
            </Link>
            .
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
  padding: '20px 0 48px',
  marginBottom: '64px',
};

const h1 = {
  color: '#333',
  fontSize: '24px',
  fontWeight: 'bold',
  margin: '40px 0',
  padding: '0',
  textAlign: 'center' as const,
};

const text = {
  color: '#333',
  fontSize: '16px',
  lineHeight: '26px',
  margin: '16px 0',
  padding: '0 40px',
};

const urgentText = {
  color: '#d97706',
  fontSize: '16px',
  lineHeight: '26px',
  margin: '16px 0',
  padding: '16px 40px',
  backgroundColor: '#fef3c7',
  borderRadius: '8px',
  fontWeight: '600',
};

const list = {
  color: '#333',
  fontSize: '16px',
  lineHeight: '26px',
  margin: '16px 0',
  padding: '0 40px 0 60px',
};

const buttonContainer = {
  padding: '27px 0 27px',
  textAlign: 'center' as const,
};

const button = {
  backgroundColor: '#7c3aed',
  borderRadius: '8px',
  color: '#fff',
  fontSize: '16px',
  fontWeight: 'bold',
  textDecoration: 'none',
  textAlign: 'center' as const,
  display: 'block',
  width: '200px',
  padding: '14px 20px',
  margin: '0 auto',
};

const footer = {
  color: '#8898aa',
  fontSize: '14px',
  lineHeight: '24px',
  margin: '16px 0',
  padding: '0 40px',
  textAlign: 'center' as const,
};

const link = {
  color: '#7c3aed',
  textDecoration: 'underline',
};
