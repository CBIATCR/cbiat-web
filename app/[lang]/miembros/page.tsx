import { accountClient } from "@/lib/supabase/server";
import { Breadcrumbs } from "@/components/breadcrumbs";
import styles from "./directory.module.css";
import { socialNetwork } from "@/lib/profile-links";
import Link from "next/link";
import { notFound } from "next/navigation";
import { isLocale } from "@/lib/i18n";

export const dynamic = "force-dynamic";

type Group = { id: string; name_es: string; name_en: string };
type Person = {
  has_photo: boolean;
  id: string;
  full_name: string;
  organization: string | null;
  title: string | null;
  biography: string | null;
  social_links: string[];
  groups: Group[];
};

async function loadPeople(): Promise<Person[] | null> {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
  if (!url || !key) return null;
  try {
    const response = await fetch(new URL("/rest/v1/rpc/directory_cards", url), {
      method: "POST",
      headers: { apikey: key, "Content-Type": "application/json" },
      body: "{}",
      cache: "no-store",
    });
    if (!response.ok) return null;
    return await response.json();
  } catch {
    return null;
  }
}

function socialLink(value: string) {
  try {
    const url = new URL(value);
    return ["https:", "http:"].includes(url.protocol) ? url : null;
  } catch {
    return null;
  }
}

async function canEnterSpace() {
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY) return false;
  const client = await accountClient();
  const { data: { user } } = await client.auth.getUser();
  if (!user) return false;
  const { data } = await client.from("profiles").select("status").eq("id", user.id).maybeSingle();
  return data?.status === "approved";
}

export default async function Directory({ params, searchParams }: {
  params: Promise<{ lang: string }>;
  searchParams: Promise<{ grupo?: string }>;
}) {
  const { lang } = await params;
  if (!isLocale(lang)) notFound();
  const es = lang === "es";
  const selected = (await searchParams).grupo;
  const [people, member] = await Promise.all([loadPeople(), canEnterSpace()]);
  const groups = new Map<string, Group>();
  for (const person of people ?? []) {
    for (const group of person.groups) groups.set(group.id, group);
  }
  const visible = selected ? people?.filter(p => p.groups.some(g => g.id === selected)) : people;
  const path = "/" + lang + "/miembros";
  const allLabel = es ? "Todas las personas" : "Everyone";
  const options = Array.from(groups.values()).sort((a,b) => (es ? a.name_es : a.name_en).localeCompare(es ? b.name_es : b.name_en, lang));
  return (
    <main className={styles.page}><div className={styles.inner}>
      <div style={{marginBottom: "0.75rem"}}><Breadcrumbs lang={lang} parent={member ? "espacio" : undefined} current={es ? "Directorio de personas" : "People directory"} /></div>
      <header className={styles.heading}>
        <h1>{es ? "Directorio de personas" : "People directory"}</h1>
        {visible && <span className={styles.count}>{visible.length} {es ? (visible.length === 1 ? "perfil" : "perfiles") : (visible.length === 1 ? "profile" : "profiles")}</span>}
      </header>
      {options.length > 0 && <nav className={styles.filters} aria-label={es ? "Filtrar por junta o comisión" : "Filter by board or commission"}>
        <Link href={path} aria-current={!selected ? "page" : undefined}>{allLabel}</Link>
        {options.map(g => <Link key={g.id} href={{pathname:path, query:{grupo:g.id}}} aria-current={selected === g.id ? "page" : undefined}>{es ? g.name_es : g.name_en}</Link>)}
      </nav>}
      {!visible?.length ? <div className={styles.empty} role="status">
        <p>{people === null ? (es ? "El directorio no está disponible en este momento." : "The directory is currently unavailable.") :
          selected ? (es ? "No hay perfiles públicos en este grupo." : "No public profiles in this group.") :
          (es ? "Todavía no hay perfiles públicos." : "There are no public profiles yet.")}</p>
        {selected && <Link href={path}>{allLabel}</Link>}
      </div> : <div className={styles.grid}>{visible.map(p => {
        const name = p.full_name.trim() || (es ? "Participante" : "Participant");
        const role = [p.title,p.organization].filter(Boolean).join(" · ");
        const links = Array.from(new Set(p.social_links)).map(socialLink).filter((url): url is URL => url !== null);
        return <article key={p.id} className={styles.card}>
          <div className={styles.identity}>
            {p.has_photo ? <img className={styles.avatar} src={`/api/profile-photo/${p.id}`} alt="" loading="lazy" width={56} height={56}/> :
              <span className={styles.avatar} aria-hidden="true">{name.split(/\s+/).slice(0,2).map(word => word[0]).join("").toUpperCase()}</span>}
            <div><h2>{name}</h2>{role && <p className={styles.role}>{role}</p>}</div>
          </div>
          {p.groups.length > 0 && <div className={styles.tags}>{p.groups.map(g => <span key={g.id}>{es ? g.name_es : g.name_en}</span>)}</div>}
          {p.biography && <p className={styles.bio}>{p.biography}</p>}
          {links.length > 0 && <div className={styles.links}>{links.map((url,i) => <a key={i} href={url.href} rel="me noreferrer">{socialNetwork(url.href) ?? url.hostname}</a>)}</div>}
        </article>;
      })}</div>}
    </div></main>
  );
}
