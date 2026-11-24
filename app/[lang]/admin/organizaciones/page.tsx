import Link from "next/link";
import { notFound,redirect } from "next/navigation";
import { isLocale } from "@/lib/i18n";
import { accountClient } from "@/lib/supabase/server";
import { kinds,statusLabel,type ManagedOrganization } from "@/lib/organizations";

export default async function Review({params,searchParams}:{params:Promise<{lang:string}>;searchParams:Promise<{result?:string}>}) {
  const {lang}=await params;
  if (!isLocale(lang)) notFound();
  const es=lang==="es";
  const client=await accountClient();
  if (!(await client.auth.getUser()).data.user) redirect("/"+lang+"/cuenta");
  if ((await client.rpc("is_cbiat_admin")).data!==true) notFound();
  const {data,error}=await client.from("organizations").select("id,name,kind,description,website,location,logo,status,revision,partner").order("updated_at",{ascending:false});
  const {result}=await searchParams;
  async function review(form:FormData) {
    "use server";
    const session=await accountClient();
    const {error}=await session.rpc("review_organization",{target:form.get("id"),expected_revision:form.get("revision"),decision:form.get("decision"),is_partner:form.has("partner")});
    redirect("/"+lang+"/admin/organizaciones?result="+(error?"error":"ok"));
  }
  return <main className="account-page"><div className="account"><nav><Link href={`/${lang}/admin`}>← Admin</Link></nav>
    <h1>{es?"Revisar organizaciones":"Review organizations"}</h1>
    {result && <p role="status">{result==="ok"?(es?"Decisión guardada.":"Decision saved."):(es?"No se guardó. Revisá la versión actual.":"Unable to save. Review the latest version.")}</p>}
    {error && <p role="alert">{es?"No se pudo cargar la lista.":"Unable to load listings."}</p>}
    {data?.length===0 && <p>{es?"Todavía no hay solicitudes.":"No submissions yet."}</p>}
    {(data as ManagedOrganization[]|null)?.map(org=><article key={org.id} className="profile-fields">
      <h2>{org.name}</h2><p>{[statusLabel(org.status,es),kinds[org.kind][es?0:1],org.location].filter(Boolean).join(" · ")}</p>
      {org.logo && <img src={org.logo} alt="" width={64} height={64} style={{objectFit:"contain"}}/>}
      <p>{org.description}</p><a href={org.website} rel="noreferrer">{org.website}</a>
      <form action={review}><input name="id" type="hidden" value={org.id}/><input name="revision" type="hidden" value={org.revision}/>
        <label><input type="checkbox" name="partner" defaultChecked={org.partner}/> Partner CBIAT</label>
        <div><button className="button button-dark" name="decision" value="approved">{es?"Aprobar publicación":"Approve publication"}</button>
        <button className="button" name="decision" value="rejected">{es?"Rechazar":"Reject"}</button></div>
      </form></article>)}</div></main>;
}
