import {
  Body,
  Container,
  Head,
  Heading,
  Html,
  Preview,
  Section,
  Text,
  Hr,
} from '@react-email/components';
import { APP_NAME } from '@/lib/constants';

interface EvictionNoticeEmailProps {
  tenantName: string;
  propertyAddress: string;
  unitName: string;
  noticeType: string;
  reason: string;
  amountOwed?: number;
  deadlineDate: string;
  landlordName: string;
}

export default function EvictionNoticeEmail({
  tenantName,
  propertyAddress,
  unitName,
  noticeType,
  reason,
  amountOwed,
  deadlineDate,
  landlordName,
}: EvictionNoticeEmailProps) {
  const noticeTypeLabel = {
    'three_day': '3-Day',
    'seven_day': '7-Day',
    'thirty_day': '30-Day',
  }[noticeType] || noticeType;

  return (
    <Html>
      <Head />
      <Preview>
        {noticeTypeLabel} Notice to Vacate - {propertyAddress}
      </Preview>
      <Body style={main}>
        <Container style={container}>
          <Heading style={heading}>
            {noticeTypeLabel} Notice to Vacate
          </Heading>
          
          <Text style={text}>Dear {tenantName},</Text>
          
          <Text style={text}>
            This is an official notice regarding your tenancy at:
          </Text>
          
          <Section style={infoBox}>
            <Text style={infoText}>
              <strong>Property:</strong> {propertyAddress}
            </Text>
            <Text style={infoText}>
              <strong>Unit:</strong> {unitName}
            </Text>
          </Section>

          <Text style={text}>
            <strong>Reason for Notice:</strong> {reason}
          </Text>

          {amountOwed && amountOwed > 0 && (
            <Section style={amountBox}>
              <Text style={amountText}>
                Amount Owed: ${amountOwed.toLocaleString()}
              </Text>
            </Section>
          )}

          <Section style={deadlineBox}>
            <Text style={deadlineText}>
              <strong>Deadline to Comply or Vacate:</strong>
            </Text>
            <Text style={deadlineDate as any}>
              {new Date(deadlineDate).toLocaleDateString('en-US', {
                weekday: 'long',
                year: 'numeric',
                month: 'long',
                day: 'numeric',
              })}
            </Text>
          </Section>

          <Hr style={hr} />

          <Text style={text}>
            If you have any questions or wish to discuss this matter, please contact your landlord immediately.
          </Text>

          <Text style={signature}>
            Sincerely,<br />
            {landlordName}
          </Text>

          <Hr style={hr} />

          <Text style={footer}>
            This notice was sent via {APP_NAME}. Please retain this email for your records.
          </Text>
        </Container>
      </Body>
    </Html>
  );
}

const main = {
  backgroundColor: '#f6f9fc',
  fontFamily: '-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,"Helvetica Neue",Ubuntu,sans-serif',
};

const container = {
  backgroundColor: '#ffffff',
  margin: '0 auto',
  padding: '20px 0 48px',
  marginBottom: '64px',
  maxWidth: '600px',
};

const heading = {
  fontSize: '24px',
  letterSpacing: '-0.5px',
  lineHeight: '1.3',
  fontWeight: '700',
  color: '#dc2626',
  padding: '17px 0 0',
  textAlign: 'center' as const,
};

const text = {
  margin: '0 0 16px',
  padding: '0 40px',
  fontSize: '15px',
  lineHeight: '1.6',
  color: '#333',
};

const infoBox = {
  backgroundColor: '#f8fafc',
  borderRadius: '8px',
  margin: '16px 40px',
  padding: '16px',
  border: '1px solid #e2e8f0',
};

const infoText = {
  margin: '4px 0',
  fontSize: '14px',
  color: '#475569',
};

const amountBox = {
  backgroundColor: '#fef2f2',
  borderRadius: '8px',
  margin: '16px 40px',
  padding: '16px',
  border: '1px solid #fecaca',
  textAlign: 'center' as const,
};

const amountText = {
  margin: '0',
  fontSize: '18px',
  fontWeight: '600',
  color: '#dc2626',
};

const deadlineBox = {
  backgroundColor: '#fef3c7',
  borderRadius: '8px',
  margin: '16px 40px',
  padding: '16px',
  border: '1px solid #fcd34d',
  textAlign: 'center' as const,
};

const deadlineText = {
  margin: '0 0 8px',
  fontSize: '14px',
  color: '#92400e',
};

const hr = {
  borderColor: '#e6ebf1',
  margin: '20px 40px',
};

const signature = {
  margin: '24px 0 0',
  padding: '0 40px',
  fontSize: '15px',
  lineHeight: '1.6',
  color: '#333',
};

const footer = {
  color: '#8898aa',
  fontSize: '12px',
  lineHeight: '16px',
  padding: '0 40px',
  textAlign: 'center' as const,
};
