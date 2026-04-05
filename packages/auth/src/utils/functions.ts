import db from '@workspace/database/client'

export const getRecentSessions = async (userId: string) => {
    const recentLogins = await db.session.findMany({
        where: { userId: userId },
        orderBy: { createdAt: 'desc' },
        take: 10,
    });
    return recentLogins;
}
