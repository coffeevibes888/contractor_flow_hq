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

interface DeductionItem {
  category: string;
  amount: number;
  description: string;
}

interface DepositDispositionEmailProps {
  tenantName: string;
  propertyAddress: string;
  unitName: string;
  originalDeposit: number;
  deductions: DeductionItem[];
  totalDeductions: number;
  refundAmount: number;
  refundMethod: string;
  landlordName: string;
}

export default function DepositDispositionEmail({
  tenantName,
  propertyAddress,
  unitName,
  originalDeposit,
  deductions,
  totalDeductions,
  refundAmount,
  refundMethod,
  landlordName,
}: DepositDispositionEmailProps) {
  const refundMethodLabel = {
    check: 'Check',
    ach: 'Direct Deposit (ACH)',
    cash: 'Cash',
    applied_to_balance: 'Applied to Outstanding Balance',
  }[refundMethod] || refundMethod;

  return (
    <Html>
      <Head />
      <Preview>
        Security Deposit Disposition - {propertyAddress}
      </Preview>
      <Body style={main}>
        <Container style={container}>
          <Heading style={heading}>
            Security Deposit Disposition
          </Heading>
          
          <Text style={text}>Dear {tenantName},</Text>
          
          <Text style={text}>
            This is your official security deposit disposition statement for your former residence at:
          </Text>
          
          <Section style={infoBox}>
            <Text style={infoText}>
              <strong>Property:</strong> {propertyAddress}
            </Text>
            <Text style={infoText}>
              <strong>Unit:</strong> {unitName}
            </Text>
          </Section>

          <Section style={summaryBox}>
            <Text style={summaryTitle}>Deposit Summary</Text>
            
            <div style={summaryRow}>
              <Text style={summaryLabel}>Original Deposit:</Text>
              <Text style={summaryValue}>${originalDeposit.toLocaleString()}</Text>
            </div>
            
            {deductions.length > 0 && (
              <>
                <Hr style={summaryHr} />
                <Text style={deductionsTitle}>Deductions:</Text>
                {deductions.map((item, index) => (
                  <div key={index} style={deductionRow}>
                    <Text style={deductionLabel}>
                      {item.category}: {item.description}
                    </Text>
                    <Text style={deductionValue}>-${item.amount.toLocaleString()}</Text>
                  </div>
                ))}
                <div style={summaryRow}>
                  <Text style={summaryLabel}>Total Deductions:</Text>
                  <Text style={deductionTotal}>-${totalDeductions.toLocaleString()}</Text>
                </div>
              </>
            )}
            
            <Hr style={summaryHr} />
            
            <div style={summaryRow}>
              <Text style={refundLabel}>Refund Amount:</Text>
              <Text style={refundValue}>${refundAmount.toLocaleString()}</Text>
            </div>
            
            <Text style={refundMethodText}>
              Refund Method: {refundMethodLabel}
            </Text>
          </Section>

          {refundAmount > 0 && (
            <Text style={text}>
              Your refund will be processed within 14-30 days, depending on your state's requirements.
            </Text>
          )}

          <Hr style={hr} />

          <Text style={text}>
            If you have any questions about this disposition, please contact your former landlord.
          </Text>

          <Text style={signature}>
            Sincerely,<br />
            {landlordName}
          </Text>

          <Hr style={hr} />

          <Text style={footer}>
            This statement was sent via {APP_NAME}. Please retain this email for your records.
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
  color: '#1e293b',
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

const summaryBox = {
  backgroundColor: '#f8fafc',
  borderRadius: '8px',
  margin: '16px 40px',
  padding: '20px',
  border: '1px solid #e2e8f0',
};

const summaryTitle = {
  margin: '0 0 16px',
  fontSize: '16px',
  fontWeight: '600',
  color: '#1e293b',
  textAlign: 'center' as const,
};

const summaryRow = {
  display: 'flex',
  justifyContent: 'space-between',
  marginBottom: '8px',
};

const summaryLabel = {
  margin: '0',
  fontSize: '14px',
  color: '#475569',
};

const summaryValue = {
  margin: '0',
  fontSize: '14px',
  fontWeight: '600',
  color: '#1e293b',
};

const summaryHr = {
  borderColor: '#e2e8f0',
  margin: '12px 0',
};

const deductionsTitle = {
  margin: '0 0 8px',
  fontSize: '14px',
  fontWeight: '600',
  color: '#dc2626',
};

const deductionRow = {
  display: 'flex',
  justifyContent: 'space-between',
  marginBottom: '4px',
};

const deductionLabel = {
  margin: '0',
  fontSize: '13px',
  color: '#64748b',
};

const deductionValue = {
  margin: '0',
  fontSize: '13px',
  color: '#dc2626',
};

const deductionTotal = {
  margin: '0',
  fontSize: '14px',
  fontWeight: '600',
  color: '#dc2626',
};

const refundLabel = {
  margin: '0',
  fontSize: '16px',
  fontWeight: '600',
  color: '#1e293b',
};

const refundValue = {
  margin: '0',
  fontSize: '18px',
  fontWeight: '700',
  color: '#059669',
};

const refundMethodText = {
  margin: '8px 0 0',
  fontSize: '12px',
  color: '#64748b',
  textAlign: 'center' as const,
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
