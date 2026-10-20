import React from 'react';
import {
  Body,
  Container,
  Head,
  Html,
  Section,
  Text,
  Button,
  Tailwind,
} from '@react-email/components';
import type { Locale } from '@workspace/i18n/config';
import { emailTranslator } from '../i18n';

const EmailVerification = ({ verificationLink, company, locale }: { verificationLink: string, company: string, locale?: Locale }) => {
  const t = emailTranslator(locale);
  return (
    <Html lang={locale ?? 'en'}>
      <Tailwind>
      <Head />
      <Body className="bg-gray-100 font-sans text-gray-800">
        <Container className="max-w-lg mx-auto bg-white rounded-lg shadow-md overflow-hidden">
          {/* Header */}
          <Section className="bg-green-500 text-white text-center py-4">
            <Text className="text-xl font-bold">{t('verification.heading')}</Text>
          </Section>

          {/* Content */}
          <Section className="p-6 text-center">
            <Text className="text-lg mb-4">{t('hello')}</Text>
            <Text className="mb-4">{t('verification.body')}</Text>
            <Button
              href={verificationLink}
              className="box-border w-full px-6 py-3 bg-green-500 text-white font-medium rounded-md shadow-md text-center"
            >
              {t('verification.button')}
            </Button>
            <Text className="mt-6">{t('buttonFallback')}</Text>
            <Text className="mt-2 text-green-500 underline break-all">
              <a href={verificationLink}>{verificationLink}</a>
            </Text>
            <Text className="mt-4 text-gray-600">{t('verification.ignore')}</Text>
          </Section>

          {/* Footer */}
          <Section className="bg-gray-50 text-center text-sm p-4">
            <Text className="text-gray-500">{t('rights', { year: new Date().getFullYear(), company })}</Text>
            <Text className="text-gray-500 mt-2">{t('questions')}</Text>
          </Section>
        </Container>
      </Body>
      </Tailwind>
    </Html>
  );
};

export default EmailVerification;
