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
} from 'npm:@react-email/components@0.0.22';
import * as React from 'npm:react@18.3.1';

interface ConfirmationEmailProps {
  confirmationUrl: string;
  userEmail: string;
  siteName: string;
}

export const ConfirmationEmail = ({
  confirmationUrl,
  userEmail,
  siteName = 'DukaFiti',
}: ConfirmationEmailProps) => (
  <Html>
    <Head />
    <Preview>Confirm your {siteName} account to get started</Preview>
    <Body style={main}>
      <Container style={container}>
        <Section style={logoContainer}>
          <Img
            src="https://jrmwivphspbxmacqrava.supabase.co/storage/v1/object/public/assets/logo-dark.png"
            width="60"
            height="60"
            alt={siteName}
            style={logo}
          />
          <Heading style={h1}>{siteName}</Heading>
        </Section>
        
        <Section style={heroContainer}>
          <Heading style={h2}>Welcome to {siteName}!</Heading>
          <Text style={heroText}>
            Thank you for signing up. To complete your account setup and start managing your duka, please confirm your email address.
          </Text>
        </Section>

        <Section style={buttonContainer}>
          <Button style={button} href={confirmationUrl}>
            Confirm Your Account
          </Button>
        </Section>

        <Section style={infoContainer}>
          <Text style={infoText}>
            This confirmation link will expire in 24 hours for security reasons.
          </Text>
          <Text style={infoText}>
            If the button doesn't work, you can copy and paste this link into your browser:
          </Text>
          <Link href={confirmationUrl} style={link}>
            {confirmationUrl}
          </Link>
        </Section>

        <Section style={footerContainer}>
          <Text style={footerText}>
            If you didn't create an account with {siteName}, you can safely ignore this email.
          </Text>
          <Text style={footerText}>
            Need help? Contact our support team at support@dukafiti.com
          </Text>
        </Section>
      </Container>
    </Body>
  </Html>
);

// Styles
const main = {
  backgroundColor: '#f6f9fc',
  fontFamily: '-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,"Helvetica Neue",Ubuntu,sans-serif',
};

const container = {
  backgroundColor: '#ffffff',
  margin: '0 auto',
  padding: '20px 0 48px',
  marginBottom: '64px',
};

const logoContainer = {
  padding: '32px 20px',
  textAlign: 'center' as const,
  borderBottom: '1px solid #f0f0f0',
};

const logo = {
  margin: '0 auto',
  borderRadius: '12px',
};

const h1 = {
  color: '#1a1a1a',
  fontSize: '28px',
  fontWeight: 'bold',
  margin: '16px 0 0 0',
  padding: '0',
};

const heroContainer = {
  padding: '32px 20px',
  textAlign: 'center' as const,
};

const h2 = {
  color: '#1a1a1a',
  fontSize: '24px',
  fontWeight: 'bold',
  margin: '0 0 16px 0',
};

const heroText = {
  color: '#6b7280',
  fontSize: '16px',
  lineHeight: '24px',
  margin: '0',
};

const buttonContainer = {
  padding: '0 20px 32px',
  textAlign: 'center' as const,
};

const button = {
  backgroundColor: '#10b981',
  borderRadius: '8px',
  color: '#fff',
  fontSize: '16px',
  fontWeight: 'bold',
  textDecoration: 'none',
  textAlign: 'center' as const,
  display: 'inline-block',
  width: '280px',
  padding: '14px 20px',
  border: 'none',
  cursor: 'pointer',
};

const infoContainer = {
  padding: '0 20px 32px',
  borderTop: '1px solid #f0f0f0',
  paddingTop: '32px',
};

const infoText = {
  color: '#6b7280',
  fontSize: '14px',
  lineHeight: '20px',
  margin: '0 0 12px 0',
  textAlign: 'center' as const,
};

const link = {
  color: '#3b82f6',
  fontSize: '14px',
  textDecoration: 'underline',
  wordBreak: 'break-all' as const,
  textAlign: 'center' as const,
  display: 'block',
  margin: '0 0 16px 0',
};

const footerContainer = {
  padding: '0 20px',
  borderTop: '1px solid #f0f0f0',
  paddingTop: '32px',
};

const footerText = {
  color: '#9ca3af',
  fontSize: '12px',
  lineHeight: '16px',
  margin: '0 0 8px 0',
  textAlign: 'center' as const,
};

export default ConfirmationEmail;