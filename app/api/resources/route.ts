import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!
);

export async function GET() {
  try {
    const { data, error } = await supabase
      .from("resources")
      .select("*")
      .eq("state", "WA")
      .order("organization_name", {
        ascending: true,
      });

    if (error) {
      console.error("Supabase resource error:", error);

      return NextResponse.json(
        { error: "Unable to load resources." },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      resources: data ?? [],
    });
  } catch (error) {
    console.error("Resource API error:", error);

    return NextResponse.json(
      { error: "Something went wrong while loading resources." },
      { status: 500 }
    );
  }
}