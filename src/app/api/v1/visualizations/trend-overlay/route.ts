import { NextRequest, NextResponse } from "next/server";

export async function GET(req: NextRequest) {
  try {
    return NextResponse.json({
      success: true,
      endpoint: "/v1/visualizations/trend-overlay",
      message: "PlateauBreaker API endpoint",
      data: {}
    });
  } catch (error) {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
