import React from 'react';
import {
  Body,
  Container,
  Head,
  Html,
  Section,
  Text,
  Tailwind,
  Button,
} from '@react-email/components';
import type { Locale } from '@workspace/i18n/config';
import { emailTranslator } from '../i18n';

const Invitation = ({ inviteLink, company, locale }: { inviteLink: string; company: string; locale?: Locale }) => {
  const t = emailTranslator(locale);
  return (
    <Html lang={locale ?? 'en'}>
      <Head />
      <Tailwind>
        <Body className="bg-gray-100 font-sans text-gray-800">
          <Container className="max-w-lg mx-auto bg-white rounded-lg shadow-md overflow-hidden">
            <Section className="bg-green-500 text-white text-center py-4">
              <Text className="text-xl font-bold">{t('invitation.heading', { company })}</Text>
            </Section>
            <Section className="p-6 text-center">
              <Text className="text-lg mb-4">{t('hello')}</Text>
              <Text className="mb-4">{t('invitation.body', { company })}</Text>
              <Button
                href={inviteLink}
                className="box-border w-full px-6 py-3 bg-green-500 text-white font-medium rounded-md shadow-md text-center"
              >
                {t('invitation.button')}
              </Button>
              <Text className="mt-6">{t('invitation.linkFallback')}</Text>
              <Text className="mt-2 text-green-500 underline break-all">
                <a href={inviteLink}>{inviteLink}</a>
              </Text>
              <Text className="mt-4 text-gray-600">{t('invitation.expires')}</Text>
            </Section>
            <Section className="bg-gray-50 text-center text-sm p-4">
              <Text className="text-gray-500">{t('rights', { year: new Date().getFullYear(), company })}</Text>
            </Section>
          </Container>
        </Body>
      </Tailwind>
    </Html>
  );
};

export default Invitation;
