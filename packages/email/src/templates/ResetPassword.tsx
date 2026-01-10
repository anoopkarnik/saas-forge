import React from 'react';
import {
  Body,
  Container,
  Head,
  Html,
  Section,
  Text,
  Tailwind,
} from '@react-email/components';

const ResetPassword = ({ resetPasswordLink }: { resetPasswordLink: string }) => {
  return (
    <Html>
      <Head />
      <Tailwind>
        <Body className="bg-gray-100 font-sans text-gray-800">
          <Container className="max-w-lg mx-auto bg-white rounded-lg shadow-md overflow-hidden">
            {/* Header */}
            <Section className="bg-green-500 text-white text-center py-4">
              <Text className="text-xl font-bold">Reset your Password</Text>
            </Section>

            {/* Content */}
            <Section className="p-6 text-center">
              <Text className="text-lg mb-4">Hello,</Text>
              <Text className="mb-4">
                Please click the button below to reset your password:
              </Text>
              <a
                href={resetPasswordLink}
                className="inline-block px-6 py-3 bg-green-500 text-white font-medium rounded-md shadow-md hover:bg-green-800 transition"
                style={{ color: 'white' }}
              >
                Reset Password
              </a>
              <Text className="mt-6">
                If the button above doesn't work, copy and paste the following
                link into your browser:
              </Text>
              <Text className="mt-2 text-green-500 underline break-all">
                <a href={resetPasswordLink}>{resetPasswordLink}</a>
              </Text>
              <Text className="mt-4 text-gray-600">
                If you do not want to reset your password, no further action is
                required.
              </Text>
            </Section>

            {/* Footer */}
            <Section className="bg-gray-50 text-center text-sm p-4">
              <Text className="text-gray-500">
                &copy; 2024 Bayesian Labs. All rights reserved.
              </Text>
              <Text className="text-gray-500 mt-2">
                If you have any questions, feel free to <a
                  href="mailto:support@bsamaritan.com"
                  className="text-green-500 underline"
                >
                  contact us</a>.
              </Text>
            </Section>
          </Container>
        </Body>
      </Tailwind>
    </Html>
  );
};

export default ResetPassword;
