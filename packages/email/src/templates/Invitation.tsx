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

const Invitation = ({ inviteLink, company }: { inviteLink: string; company: string }) => {
  return (
    <Html>
      <Head />
      <Tailwind>
        <Body className="bg-gray-100 font-sans text-gray-800">
          <Container className="max-w-lg mx-auto bg-white rounded-lg shadow-md overflow-hidden">
            <Section className="bg-green-500 text-white text-center py-4">
              <Text className="text-xl font-bold">You're invited to {company}</Text>
            </Section>
            <Section className="p-6 text-center">
              <Text className="text-lg mb-4">Hello,</Text>
              <Text className="mb-4">
                You've been invited to join {company}. Click below to create your account:
              </Text>
              <Button
                href={inviteLink}
                className="box-border w-full px-6 py-3 bg-green-500 text-white font-medium rounded-md shadow-md text-center"
              >
                Accept Invitation
              </Button>
              <Text className="mt-6">
                If the button above doesn't work, copy and paste this link into your browser:
              </Text>
              <Text className="mt-2 text-green-500 underline break-all">
                <a href={inviteLink}>{inviteLink}</a>
              </Text>
              <Text className="mt-4 text-gray-600">
                This invitation will expire in 7 days.
              </Text>
            </Section>
            <Section className="bg-gray-50 text-center text-sm p-4">
              <Text className="text-gray-500">
                &copy; 2025 {company}. All rights reserved.
              </Text>
            </Section>
          </Container>
        </Body>
      </Tailwind>
    </Html>
  );
};

export default Invitation;
