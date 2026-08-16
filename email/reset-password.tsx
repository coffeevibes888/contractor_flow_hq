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

type ResetPasswordProps = {
  email: string;
  resetLink: string;
};

export default function ResetPassword({ email, resetLink }: ResetPasswordProps) {
  return (
    <Html>
      <Preview>Reset your password</Preview>
      <Tailwind>
        <Head />
        <Body className='font-sans bg-white'>
          <Container className='max-w-xl'>
            <Heading className='text-2xl font-bold'>Reset Your Password</Heading>
            <Section className='my-4'>
              <Text className='text-gray-600'>
                We received a request to reset your password. Click the button below to create a new password.
              </Text>
            </Section>
            <Section className='my-6 text-center'>
              <Button
                href={resetLink}
                className='bg-black text-white px-8 py-3 rounded font-semibold'
              >
                Reset Password
              </Button>
            </Section>
            <Section className='my-4 border-t pt-4'>
              <Text className='text-sm text-gray-500'>
                Or copy and paste this link in your browser:
              </Text>
              <Text className='text-sm text-blue-600 break-all'>
                {resetLink}
              </Text>
            </Section>
            <Section className='my-4 border-t pt-4'>
              <Text className='text-xs text-gray-400'>
                This link will expire in 1 hour.
              </Text>
              <Text className='text-xs text-gray-400'>
                If you didn't request a password reset, you can safely ignore this email.
              </Text>
            </Section>
          </Container>
        </Body>
      </Tailwind>
    </Html>
  );
}
