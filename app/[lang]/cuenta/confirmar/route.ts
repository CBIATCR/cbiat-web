import { NextResponse, type NextRequest } from "next/server";
import { accountClient } from "@/lib/supabase/server";

export async function GET(request: NextRequest, { params }: { params: Promise<{ lang: string }> }) {
  const { lang } = await params;
  const account = new URL(lang === "en" ? "/en/cuenta" : "/es/cuenta", request.url);
  const code = request.nextUrl.searchParams.get("code");
  if (code) {
    const client = await accountClient();
    const { error } = await client.auth.exchangeCodeForSession(code);
    if (!error) return NextResponse.redirect(account);
  }
  account.searchParams.set("msg", "signin");
  return NextResponse.redirect(account);
}
