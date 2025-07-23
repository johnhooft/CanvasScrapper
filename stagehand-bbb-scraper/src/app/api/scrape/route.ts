import { NextRequest, NextResponse } from "next/server";
import { runScraper } from "@/lib/scraper";
import { z } from "zod";

export async function POST(req: NextRequest) {
  const body = await req.json();

  const schema = z.object({
    url: z.string().url(),
    LLM: z.boolean(),
  });

  const result = schema.safeParse(body);
  
  if (!result.success) {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }

  try {
    // Calls the scraper script, passes in the Search URL, and the extract Model (LLM: <Boolean>)
    const data = await runScraper(result.data.url, result.data.LLM);
    return NextResponse.json(data);
  } catch (e) {
    console.error("Scraper error:", e);
    return NextResponse.json({ error: "Scraper failed" }, { status: 500 });
  }
}
