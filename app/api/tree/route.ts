import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

function compareTextCode(a: string, b: string) {
  return a.localeCompare(b, "ko", {
    numeric: true,
    sensitivity: "base",
  });
}

function extractRoundNumber(name: string) {
  const match = (name || "").match(/\d+/);
  return match ? Number(match[0]) : Number.MAX_SAFE_INTEGER;
}

function compareRoundName(a: string, b: string) {
  const numA = extractRoundNumber(a);
  const numB = extractRoundNumber(b);

  if (numA !== numB) return numA - numB;

  return a.localeCompare(b, "ko", {
    numeric: true,
    sensitivity: "base",
  });
}

export async function GET() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!url || !anon) {
    return NextResponse.json(
      { error: "Missing env", url: !!url, anon: !!anon },
      { status: 500 }
    );
  }

  const supabase = createClient(url, anon);

  const { data: vendors, error: vErr } = await supabase
    .from("vendors")
    .select("id, code, name, created_at");

  if (vErr) {
    return NextResponse.json({ error: vErr.message }, { status: 500 });
  }

  const { data: styles, error: sErr } = await supabase
    .from("styles")
    .select("id, vendor_id, code, name, created_at");

  if (sErr) {
    return NextResponse.json({ error: sErr.message }, { status: 500 });
  }

  const { data: rounds, error: rErr } = await supabase
    .from("rounds")
    .select("id, style_id, name, with_vat, created_at");

  if (rErr) {
    return NextResponse.json({ error: rErr.message }, { status: 500 });
  }

  const stylesByVendor = new Map<string, any[]>();
  for (const s of styles ?? []) {
    if (!stylesByVendor.has(s.vendor_id)) {
      stylesByVendor.set(s.vendor_id, []);
    }

    stylesByVendor.get(s.vendor_id)!.push({
      ...s,
      rounds: [],
    });
  }

  const roundsByStyle = new Map<string, any[]>();
  for (const r of rounds ?? []) {
    if (!roundsByStyle.has(r.style_id)) {
      roundsByStyle.set(r.style_id, []);
    }

    roundsByStyle.get(r.style_id)!.push(r);
  }

  const tree = (vendors ?? []).map((v) => {
    const vStyles = stylesByVendor.get(v.id) ?? [];

    for (const st of vStyles) {
      const styleRounds = roundsByStyle.get(st.id) ?? [];
      styleRounds.sort((a, b) => compareRoundName(a.name, b.name));
      st.rounds = styleRounds;
    }

    vStyles.sort((a, b) => compareTextCode(a.code, b.code));

    return {
      ...v,
      styles: vStyles,
    };
  });

  tree.sort((a, b) => compareTextCode(a.code, b.code));

  return NextResponse.json({ vendors: tree });
}