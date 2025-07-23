import { createClient } from '@supabase/supabase-js';
import { NextRequest, NextResponse } from 'next/server';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export async function POST(req: NextRequest) {
  const { error } = await supabase
    .from('businesses')
    .delete()
    .neq('name', ''); // broad match to delete all

  if (error) {
    console.error("Supabase delete error:", error.message, error.details);
    return NextResponse.json({ error: 'Delete failed' }, { status: 500 });
  }

  return NextResponse.json({ success: true, message: 'All business data deleted' }, { status: 200 });
}