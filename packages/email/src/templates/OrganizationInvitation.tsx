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
import { createTranslator } from 'use-intl';
import { DEFAULT_LOCALE, type Locale } from '@workspace/i18n/config';
import { getMessages } from '@workspace/i18n/messages';
import { emailTranslator } from '../i18n';

type OrganizationInvitationProps = {
  organizationName: string;
  inviterName: string;
  role: string;
  inviteLink: string;
  company: string;
  locale?: Locale;
};

const OrganizationInvitation = ({
  organizationName,
  inviterName,
  role,
  inviteLink,
  company,
  locale = DEFAULT_LOCALE,
}: OrganizationInvitationProps) => {
  const t = createTranslator({ locale, messages: getMessages(locale), namespace: 'multi_tenancy.email.invitation' });
  const common = emailTranslator(locale);
  return (
    <Html lang={locale}>
      <Head />
      <Tailwind>
        <Body className="bg-gray-100 font-sans text-gray-800">
          <Container className="max-w-lg mx-auto bg-white rounded-lg shadow-md overflow-hidden">
            <Section className="bg-green-500 text-white text-center py-4">
              <Text className="text-xl font-bold">{t('heading', { organization: organizationName, company })}</Text>
            </Section>
            <Section className="p-6 text-center">
              <Text className="text-lg mb-4">{common('hello')}</Text>
              <Text className="mb-4">{t('body', { inviter: inviterName, organization: organizationName, role })}</Text>
              <Button
                href={inviteLink}
                className="box-border w-full px-6 py-3 bg-green-500 text-white font-medium rounded-md shadow-md text-center"
              >
                {t('button')}
              </Button>
              <Text className="mt-6">{t('help')}</Text>
              <Text className="mt-2 text-green-500 underline break-all">
                <a href={inviteLink}>{inviteLink}</a>
              </Text>
              <Text className="mt-4 text-gray-600">{t('expires')}</Text>
            </Section>
            <Section className="bg-gray-50 text-center text-sm p-4">
              <Text className="text-gray-500">{common('rights', { year: new Date().getFullYear(), company })}</Text>
            </Section>
          </Container>
        </Body>
      </Tailwind>
    </Html>
  );
};

export default OrganizationInvitation;
