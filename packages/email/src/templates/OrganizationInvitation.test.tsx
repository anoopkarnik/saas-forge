import { describe, it, expect } from 'vitest';
import { render } from '@react-email/render';
import OrganizationInvitation from './OrganizationInvitation';

describe('OrganizationInvitation', () => {
    it('renders the organization, inviter, role and accept link', async () => {
        const html = await render(
            OrganizationInvitation({
                organizationName: 'Acme Team',
                inviterName: 'Alex',
                role: 'admin',
                inviteLink: 'https://x.test/accept-invitation/inv_1',
                company: 'Acme',
            })
        );

        expect(html).toContain('Acme Team');
        expect(html).toContain('Alex');
        expect(html).toContain('admin');
        expect(html).toContain('href="https://x.test/accept-invitation/inv_1"');
    });
});
