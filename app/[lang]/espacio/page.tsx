import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { isLocale } from "@/lib/i18n";
import { accountClient } from "@/lib/supabase/server";

export default async function MemberSpace({params}: {params: Promise<{lang:string}>}) {
  const { lang } = await params;
  if (!isLocale(lang)) notFound();
  const account = "/" + lang + "/cuenta";
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY) redirect(account);
  const client = await accountClient();
  const { data: { user } } = await client.auth.getUser();
  if (!user) redirect(account);
  const { data } = await client.from("profiles").select("status").eq("id", user.id).single();
  if (data?.status !== "approved") redirect(account);
  return <main className="work"><div className="shell account">
    <h1>{lang === "es" ? "Espacio de la Cámara" : "Chamber space"}</h1>
    <Link href={account}>{lang === "es" ? "Editar mi perfil" : "Edit my profile"}</Link>
    <Link href={`/${lang}/miembros`}>{lang === "es" ? "Directorio de personas" : "People directory"}</Link>
  </div></main>;
}
