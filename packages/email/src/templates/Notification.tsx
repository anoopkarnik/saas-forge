import React from 'react';
import { Body, Button, Container, Head, Html, Section, Tailwind, Text } from '@react-email/components';
import { createTranslator } from 'use-intl';
import { DEFAULT_LOCALE, type Locale } from '@workspace/i18n/config';
import { getMessages } from '@workspace/i18n/messages';

/** A notification sent by email (notifications module). */
const Notification = ({
  title,
  body,
  link,
  company,
  locale = DEFAULT_LOCALE,
}: {
  title: string;
  body: string;
  link?: string | null;
  company: string;
  locale?: Locale;
}) => {
  const t = createTranslator({ locale, messages: getMessages(locale), namespace: 'notifications.email' });
  return (
    <Html lang={locale}>
      <Head />
      <Tailwind>
        <Body className="bg-gray-100 font-sans text-gray-800">
          <Container className="max-w-lg mx-auto bg-white rounded-lg shadow-md overflow-hidden">
            <Section className="bg-green-500 text-white text-center py-4">
              <Text className="text-xl font-bold">{title}</Text>
            </Section>
            <Section className="p-6">
              <Text className="mb-4">{body}</Text>
              {link ? (
                <Button
                  href={link}
                  className="box-border w-full px-6 py-3 bg-green-500 text-white font-medium rounded-md text-center"
                >
                  {t('open', { company })}
                </Button>
              ) : null}
              <Text className="mt-6 text-sm text-gray-600">{t('footer', { company })}</Text>
            </Section>
          </Container>
        </Body>
      </Tailwind>
    </Html>
  );
};

export default Notification;
