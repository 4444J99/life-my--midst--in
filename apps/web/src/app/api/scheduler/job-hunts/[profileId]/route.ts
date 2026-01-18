import { NextRequest, NextResponse } from 'next/server';

export async function DELETE(_request: NextRequest, { params }: { params: { profileId: string } }) {
  const { profileId } = params;
  const orchestratorUrl = process.env['ORCHESTRATOR_URL'] || 'http://localhost:3002';

  try {
    const response = await fetch(`${orchestratorUrl}/scheduler/job-hunts/${profileId}`, {
      method: 'DELETE',
    });

    if (!response.ok) {
      return NextResponse.json({ error: 'Failed to delete job hunt' }, { status: response.status });
    }

    const data = await response.json();
    return NextResponse.json(data);
  } catch (error) {
    console.error('Proxy error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
