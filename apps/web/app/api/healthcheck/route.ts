import { NextResponse } from 'next/server';

export async function GET() {
  const healthCheckData = {
    status: 'healthy',
    uptime: process.uptime(),
    timestamp: new Date().toISOString(),
  };

  return NextResponse.json(healthCheckData, { status: 200 });
}
