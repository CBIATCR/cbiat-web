import { notFound } from "next/navigation";
import { accountClient } from "@/lib/supabase/server";
import { isLocale } from "@/lib/i18n";
import { kinds,type Organization } from "@/lib/organizations";
import { Breadcrumbs } from "@/components/breadcrumbs";
import { DirectoryTabs } from "@/components/directory-tabs";
import styles from "../miembros/directory.module.css";

export const dynamic="force-dynamic";
export default async function Organizations({params}:{params:Promise<{lang:string}>}) {
  const {lang}=await params;
  if (!isLocale(lang)) notFound();
  const es=lang==="es";
  const title=es?"Directorio de organizaciones":"Organization directory";
  const configured=Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY);
  const client=configured?await accountClient():null;
  const response=await client?.rpc("organization_directory");
  const {data:auth}=client?await client.auth.getUser():{data:null};
  const profile=auth?.user && client ? (await client.from("profiles").select("status").eq("id",auth.user.id).maybeSingle()).data:null;
  const rows:Organization[]=response?.data ?? [];
  return <main className={styles.page}><div className={styles.inner}>
    <Breadcrumbs lang={lang} parent={profile?.status==="approved"?"espacio":undefined} current={title}/>
    <header className={styles.heading}><h1>{title}</h1></header>
    <DirectoryTabs lang={lang} active="organizaciones"/>
    {!response || response.error ? <p role="alert">{es?"El directorio no está disponible.":"The directory is unavailable."}</p> :
      rows.length===0 ? <p className={styles.empty}>{es?"Todavía no hay organizaciones publicadas.":"No organizations have been published yet."}</p> :
      <div className={styles.grid}>{rows.map(org=><article key={org.id} className={styles.card}>
        <div className={styles.identity}>{org.logo && <img src={org.logo} alt="" width={56} height={56} style={{objectFit:"contain"}}/>}
          <div><h2>{org.name}</h2><p className={styles.role}>{[kinds[org.kind][es?0:1],org.location].filter(Boolean).join(" · ")}</p></div></div>
        {org.partner && <div className={styles.tags}><span>Partner CBIAT</span></div>}
        <p className={styles.bio}>{org.description}</p><div className={styles.links}><a href={org.website} rel="external noreferrer">{es?"Visitar sitio web":"Visit website"}</a></div>
      </article>)}</div>}
  </div></main>;
}
