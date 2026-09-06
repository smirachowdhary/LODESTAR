import { NextResponse } from "next/server";

export async function GET() {
  try {
    const rawUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const rawKey =
      process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

    if (!rawUrl) {
      return NextResponse.json(
        { error: "SUPABASE URL missing" },
        { status: 500 }
      );
    }

    if (!rawKey) {
      return NextResponse.json(
        { error: "SUPABASE KEY missing" },
        { status: 500 }
      );
    }

    const supabaseUrl = rawUrl.trim().replace(/\/+$/, "");
    const supabaseKey = rawKey.trim();

    const endpoint =
      `${supabaseUrl}/rest/v1/resources` +
      `?select=*&state=eq.WA&order=organization_name.asc`;

    console.log("Supabase host:", new URL(supabaseUrl).hostname);

    const response = await fetch(endpoint, {
      method: "GET",
      headers: {
        apikey: supabaseKey,
        Authorization: `Bearer ${supabaseKey}`,
        Accept: "application/json",
      },
      cache: "no-store",
    });

    const text = await response.text();

    if (!response.ok) {
      return NextResponse.json(
        {
          error: "Supabase REST request failed.",
          status: response.status,
          statusText: response.statusText,
          details: text,
        },
        { status: 500 }
      );
    }

    let data;

    try {
      data = JSON.parse(text);
    } catch {
      return NextResponse.json(
        {
          error: "Supabase returned invalid JSON.",
          details: text.slice(0, 1000),
        },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      count: data.length,
      resources: data,
    });
  } catch (error: any) {
    console.error("RAW SUPABASE ERROR:", error);

    return NextResponse.json(
      {
        error: "Direct Supabase connection failed.",
        message: error?.message || String(error),
        cause:
          error?.cause?.message ||
          error?.cause?.code ||
          String(error?.cause || ""),
      },
      { status: 500 }
    );
  }
}