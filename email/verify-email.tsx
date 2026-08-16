import {
  Body,
  Button,
  Container,
  Head,
  Heading,
  Html,
  Preview,
  Section,
  Tailwind,
  Text,
} from '@react-email/components';

type VerifyEmailProps = {
  email: string;
  verificationLink: string;
};

export default function VerifyEmail({
  email,
  verificationLink,
}: VerifyEmailProps) {
  return (
    <Html>
      <Preview>Verify your email address</Preview>
      <Tailwind>
        <Head />
        <Body className='font-sans bg-white'>
          <Container className='max-w-xl'>
            <Heading className='text-2xl font-bold'>Verify Your Email</Heading>
            <Section className='my-4'>
              <Text className='text-gray-600'>
                Welcome to Property Flow HQ! Please verify your email address to
                complete your registration.
              </Text>
            </Section>
            <Section className='my-6 text-center'>
              <Button
                href={verificationLink}
                className='bg-black text-white px-8 py-3 rounded font-semibold'
              >
                Verify Email
              </Button>
            </Section>
            <Section className='my-4 border-t pt-4'>
              <Text className='text-sm text-gray-500'>
                Or copy and paste this link in your browser:
              </Text>
              <Text className='text-sm text-blue-600 break-all'>
                {verificationLink}
              </Text>
            </Section>
            <Section className='my-4 border-t pt-4'>
              <Text className='text-xs text-gray-400'>
                This link will expire in 24 hours.
              </Text>
              <Text className='text-xs text-gray-400'>
                If you didn't create this account, you can safely ignore this email.
              </Text>
            </Section>
          </Container>
        </Body>
      </Tailwind>
    </Html>
  );
}
