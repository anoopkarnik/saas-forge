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

type OrganizationInvitationProps = {
  organizationName: string;
  inviterName: string;
  role: string;
  inviteLink: string;
  company: string;
};

const OrganizationInvitation = ({
  organizationName,
  inviterName,
  role,
  inviteLink,
  company,
}: OrganizationInvitationProps) => {
  return (
    <Html>
      <Head />
      <Tailwind>
        <Body className="bg-gray-100 font-sans text-gray-800">
          <Container className="max-w-lg mx-auto bg-white rounded-lg shadow-md overflow-hidden">
            <Section className="bg-green-500 text-white text-center py-4">
              <Text className="text-xl font-bold">Join {organizationName} on {company}</Text>
            </Section>
            <Section className="p-6 text-center">
              <Text className="text-lg mb-4">Hello,</Text>
              <Text className="mb-4">
                {inviterName} invited you to join the {organizationName} workspace as {role}.
              </Text>
              <Button
                href={inviteLink}
                className="box-border w-full px-6 py-3 bg-green-500 text-white font-medium rounded-md shadow-md text-center"
              >
                View Invitation
              </Button>
              <Text className="mt-6">
                Sign in (or create an account) with this email address to accept. You can also
                accept it later from the workspace menu in the app.
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
                &copy; {new Date().getFullYear()} {company}. All rights reserved.
              </Text>
            </Section>
          </Container>
        </Body>
      </Tailwind>
    </Html>
  );
};

export default OrganizationInvitation;
