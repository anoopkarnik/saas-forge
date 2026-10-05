import React from 'react';
import {
  Body,
  Button,
  Container,
  Head,
  Html,
  Section,
  Tailwind,
  Text,
} from '@react-email/components';

export type ReleaseNotesProject = {
  name: string;
  entries: Array<{ type: string; title: string; migration?: boolean }>;
};

const LABELS: Record<string, string> = {
  feature: 'New',
  fix: 'Fix',
  security: 'Security',
  breaking: 'Breaking',
};

/** Root-only: the release email sent to opted-in SaaS Forge project owners. */
const ReleaseNotes = ({
  version,
  highlights,
  projects,
  upgradeLink,
  company,
}: {
  version: string;
  highlights: string[];
  projects: ReleaseNotesProject[];
  upgradeLink: string;
  company: string;
}) => {
  return (
    <Html>
      <Head />
      <Tailwind>
        <Body className="bg-gray-100 font-sans text-gray-800">
          <Container className="max-w-lg mx-auto bg-white rounded-lg shadow-md overflow-hidden">
            <Section className="bg-green-500 text-white text-center py-4">
              <Text className="text-xl font-bold">{company} {version} is out</Text>
            </Section>
            <Section className="p-6">
              {highlights.map((highlight) => (
                <Text key={highlight} className="mb-2">{highlight}</Text>
              ))}
              {projects.map((project) => (
                <Section key={project.name} className="mt-4">
                  <Text className="font-bold mb-1">What changed for {project.name}</Text>
                  {project.entries.map((entry) => (
                    <Text key={`${entry.type}-${entry.title}`} className="my-1">
                      [{LABELS[entry.type] ?? entry.type}] {entry.title}
                      {entry.migration ? ' (database migration)' : ''}
                    </Text>
                  ))}
                </Section>
              ))}
              <Button
                href={upgradeLink}
                className="box-border w-full mt-6 px-6 py-3 bg-green-500 text-white font-medium rounded-md text-center"
              >
                Open the Upgrade Center
              </Button>
              <Text className="mt-6 text-sm text-gray-600">
                You get these emails because you turned on release emails in My Projects. Turn them off there:{' '}
                <a href={upgradeLink}>{upgradeLink}</a>
              </Text>
            </Section>
          </Container>
        </Body>
      </Tailwind>
    </Html>
  );
};

export default ReleaseNotes;
