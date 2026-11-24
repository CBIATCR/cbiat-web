import { socialNetwork } from "@/lib/profile-links";
import Link from "next/link";
import { notFound } from "next/navigation";
import { isLocale } from "@/lib/i18n";

export const dynamic = "force-dynamic";

type Group = { id: string; name_es: string; name_en: string };
type Person = {
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
    const response = await fetch(new URL("/rest/v1/rpc/directory_people_with_groups", url), {
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

export default async function Directory({ params, searchParams }: {
  params: Promise<{ lang: string }>;
  searchParams: Promise<{ grupo?: string }>;
}) {
  const { lang } = await params;
  if (!isLocale(lang)) notFound();
  const es = lang === "es";
  const selected = (await searchParams).grupo;
  const people = await loadPeople();
  const groups = new Map<string, Group>();
  for (const person of people ?? []) {
    for (const group of person.groups) groups.set(group.id, group);
  }
  const visible = selected ? people?.filter(p => p.groups.some(g => g.id === selected)) : people;
  const path = "/" + lang + "/miembros";
  return (
    <main className="work">
      <div className="shell">
        <h1>{es ? "Directorio de personas" : "People directory"}</h1>
        {groups.size > 0 && (
          <form action={path}>
            <label htmlFor="grupo">{es ? "Junta o comisión" : "Board or commission"} </label>
            <select id="grupo" name="grupo" defaultValue={selected ?? ""}>
              <option value="">{es ? "Todas" : "All"}</option>
              {Array.from(groups.values()).map(g => <option value={g.id} key={g.id}>{es ? g.name_es : g.name_en}</option>)}
            </select>
            <button className="button button-dark">{es ? "Filtrar" : "Filter"}</button>
          </form>
        )}
        {people === null ? <p role="status">{es ? "El directorio no está disponible en este momento." : "The directory is currently unavailable."}</p>
          : !visible?.length && <p>{es ? "No hay perfiles públicos para mostrar." : "There are no public profiles to display."} {selected && <Link href={path}>{es ? "Ver todos" : "View all"}</Link>}</p>}
        <div className="cards">
          {visible?.map(p => (
            <article key={p.id}>
              <h2>{p.full_name}</h2>
              <p>{[p.title, p.organization].filter(Boolean).join(" · ")}</p>
              {p.biography && <p>{p.biography}</p>}
              {p.groups.length > 0 && <p>{p.groups.map(g => es ? g.name_es : g.name_en).join(" · ")}</p>}
              {Array.from(new Set(p.social_links)).map(value => {
                const url = socialLink(value);
                return url && <p key={value}><a href={url.href} rel="me noreferrer">{socialNetwork(value) ?? url.hostname}</a></p>;
              })}
            </article>
          ))}
        </div>
      </div>
    </main>
  );
}
