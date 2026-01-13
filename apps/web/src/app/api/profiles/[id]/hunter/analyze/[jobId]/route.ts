import { NextRequest, NextResponse } from "next/server";

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string; jobId: string } }
) {
  const { id, jobId } = params;
  const body = await request.json();
  const apiUrl = process.env.API_URL || "http://localhost:3001";

  try {
    const response = await fetch(`${apiUrl}/profiles/${id}/hunter/analyze/${jobId}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      const error = await response.json();
      return NextResponse.json(error, { status: response.status });
    }

    const data = await response.json();
    return NextResponse.json(data);
  } catch (error) {
    console.error("Proxy error:", error);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 }
    );
  }
}
