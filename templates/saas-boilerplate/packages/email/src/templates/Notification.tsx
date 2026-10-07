import React from 'react';
import { Body, Button, Container, Head, Html, Section, Tailwind, Text } from '@react-email/components';

/** A notification sent by email (notifications module). */
const Notification = ({
  title,
  body,
  link,
  company,
}: {
  title: string;
  body: string;
  link?: string | null;
  company: string;
}) => {
  return (
    <Html>
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
                  Open {company}
                </Button>
              ) : null}
              <Text className="mt-6 text-sm text-gray-600">
                You can turn these emails off under Notifications in {company}.
              </Text>
            </Section>
          </Container>
        </Body>
      </Tailwind>
    </Html>
  );
};

export default Notification;
