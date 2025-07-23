import { createClient } from '@supabase/supabase-js';
import { NextRequest, NextResponse } from 'next/server';

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!);

export async function POST(req: NextRequest) {
    const business = await req.json();
    // Check for duplicate
    const { data: existing, error: findErr } = await supabase
        .from('businesses')
        .select('id')
        .eq('url', business.url)
        .single();

    if (findErr && findErr.code !== 'PGRST116') {
        return NextResponse.json({ error: 'Error checking for duplicates' }, { status: 500 });
    }

    if (existing) {
        return NextResponse.json({ message: 'Duplicate skipped' }, { status: 200 });
    }

    const { error } = await supabase.from('businesses').insert(business);
    if (error) {
        console.error("Supabase insert error:", error.message, error.details);
        return NextResponse.json({ error: 'Insert failed' }, { status: 500 });
    }

    return NextResponse.json({ success: true });
}
