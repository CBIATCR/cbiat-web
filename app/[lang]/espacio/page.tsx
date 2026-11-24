import { Breadcrumbs } from "@/components/breadcrumbs";
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
  const { data } = await client.from("profiles").select("status, full_name, organization, is_public, role").eq("id", user.id).single();
  if (data?.status !== "approved") redirect(account);
  const es = lang === "es";
  const name = data.full_name || user.email || (es ? "Mi perfil" : "My profile");
  const initials = name.trim().split(/\s+/).slice(0, 2).map((word: string) => word[0]).join("");
  const { data: photo } = await client.from("profile_photos").select("profile_id").eq("profile_id", user.id).maybeSingle();

  return (
    <main className="account-page">
      <div className="account chamber-space">
        <Breadcrumbs lang={lang} current={es ? "Espacio de la Cámara" : "Chamber space"} />
        <h1>{es ? "Espacio de la Cámara" : "Chamber space"}</h1>
        <section className="chamber-profile" aria-labelledby="profile-name">
          <div className="chamber-identity">
            {photo ? <img className="chamber-avatar" src={`/api/profile-photo/${user.id}`} width={64} height={64} alt=""/> :
              <span className="chamber-avatar" aria-hidden="true">{initials}</span>}
            <div>
              <h2 id="profile-name">{name}</h2>
              {data.organization && <p>{data.organization}</p>}
            </div>
          </div>
          <p className="chamber-visibility">
            {data.is_public
              ? (es ? "Tu perfil aparece en el directorio." : "Your profile is listed in the directory.")
              : (es ? "Tu perfil es privado." : "Your profile is private.")}
          </p>
          <Link className="button chamber-edit" href={account}>{es ? "Editar mi perfil" : "Edit my profile"}</Link>
        </section>
        <nav className="chamber-links" aria-label={es ? "Accesos de la Cámara" : "Chamber links"}>
          <Link href={`/${lang}/miembros`}>{es ? "Directorio de personas" : "People directory"}<span aria-hidden="true">→</span></Link>
          <Link href={`/${lang}/organizaciones`}>{es ? "Directorio de organizaciones" : "Organization directory"}<span aria-hidden="true">→</span></Link>
          <Link href={`/${lang}/espacio/organizaciones`}>{es ? "Mis organizaciones" : "My organizations"}<span aria-hidden="true">→</span></Link>
          {data.role === "admin" && <Link href={`/${lang}/admin`}>{es ? "Administrar cuentas" : "Manage accounts"}<span aria-hidden="true">→</span></Link>}
        </nav>
      </div>
    </main>
  );
}
