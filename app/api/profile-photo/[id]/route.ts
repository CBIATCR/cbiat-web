import { accountClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";
export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const headers = { "Cache-Control": "private, no-store", "X-Content-Type-Options": "nosniff" };
  if (!/^[0-9a-f]{8}(?:-[0-9a-f]{4}){3}-[0-9a-f]{12}$/i.test(id)) return new Response(null, { status: 404, headers });
  const client = await accountClient();
  const { data } = await client.from("profile_photos").select("image,mime").eq("profile_id", id).maybeSingle();
  if (!data) return new Response(null, { status: 404, headers });
  const bytes = Buffer.from(data.image.slice(2), "hex");
  return new Response(new Uint8Array(bytes), { headers: { ...headers, "Content-Type": data.mime } });
}
