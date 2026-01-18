import { NextRequest, NextResponse } from 'next/server';

export async function GET(_request: NextRequest) {
  const orchestratorUrl = process.env['ORCHESTRATOR_URL'] || 'http://localhost:3002';

  try {
    const response = await fetch(`${orchestratorUrl}/scheduler/job-hunts`);

    if (!response.ok) {
      return NextResponse.json({ error: 'Failed to fetch job hunts' }, { status: response.status });
    }

    const data = await response.json();
    return NextResponse.json(data);
  } catch (error) {
    console.error('Proxy error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  const orchestratorUrl = process.env['ORCHESTRATOR_URL'] || 'http://localhost:3002';
  const body = await request.json();

  try {
    const response = await fetch(`${orchestratorUrl}/scheduler/job-hunts`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      return NextResponse.json({ error: 'Failed to create job hunt' }, { status: response.status });
    }

    const data = await response.json();
    return NextResponse.json(data);
  } catch (error) {
    console.error('Proxy error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
