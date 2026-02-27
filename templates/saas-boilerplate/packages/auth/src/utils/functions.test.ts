import { describe, it, expect, vi, beforeEach } from 'vitest';
import { getRecentSessions } from './functions';
import db from '@workspace/database/client';

vi.mock('@workspace/database/client', () => ({
  default: {
    session: {
      findMany: vi.fn(),
    },
  },
}));

describe('Auth Functions', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should fetch recent sessions for a given user id', async () => {
    const mockSessions = [
      { id: '1', userId: 'user1', createdAt: new Date() },
      { id: '2', userId: 'user1', createdAt: new Date() },
    ];
    (db.session.findMany as any).mockResolvedValue(mockSessions);

    const result = await getRecentSessions('user1');

    expect(db.session.findMany).toHaveBeenCalledWith({
      where: { userId: 'user1' },
      orderBy: { createdAt: 'desc' },
      take: 10,
    });
    expect(result).toEqual(mockSessions);
  });
});
