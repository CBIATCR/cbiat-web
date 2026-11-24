import { notFound,redirect } from "next/navigation";
import { Breadcrumbs } from "@/components/breadcrumbs";
import { isLocale } from "@/lib/i18n";
import { accountClient } from "@/lib/supabase/server";
import { kinds,statusLabel,type ManagedOrganization } from "@/lib/organizations";
import { submitOrganization } from "@/app/actions/organizations";

export default async function MyOrganizations({params,searchParams}:{params:Promise<{lang:string}>; searchParams:Promise<{result?:string}>}) {
  const {lang}=await params;
  if (!isLocale(lang)) notFound();
  const es=lang==="es";
  const title=es?"Mis organizaciones":"My organizations";
  const client=await accountClient();
  const {data:{user}}=await client.auth.getUser();
  if (!user) redirect("/"+lang+"/cuenta");
  const {data:profile}=await client.from("profiles").select("status").eq("id",user.id).single();
  if (profile?.status!=="approved") redirect("/"+lang+"/cuenta");
  const {data,error}=await client.from("organizations").select("id,name,kind,description,website,location,status,revision").eq("owner_id",user.id).order("name");
  const {result}=await searchParams;
  function form(org?: ManagedOrganization) {
    return <form action={submitOrganization} className="profile-fields">
      <input type="hidden" name="lang" value={lang}/>
      {org && <><input type="hidden" name="id" value={org.id}/><input type="hidden" name="revision" value={org.revision}/></>}
      <label>{es?"Nombre":"Name"}<input name="name" defaultValue={org?.name} maxLength={160} required/></label>
      <label>{es?"Tipo":"Type"}<select name="kind" defaultValue={org?.kind} required>{Object.entries(kinds).map(([key,names])=><option key={key} value={key}>{names[es?0:1]}</option>)}</select></label>
      <label>{es?"Descripción":"Description"}<textarea name="description" defaultValue={org?.description} required maxLength={1600}/></label>
      <label>{es?"Sitio web":"Website"}<input type="url" name="website" defaultValue={org?.website} placeholder="https://" required maxLength={2048}/></label>
      <label>{es?"Ubicación (opcional)":"Location (optional)"}<input name="location" defaultValue={org?.location} maxLength={160}/></label>
      <label>Logo (PNG/JPG, 128 KB)<input type="file" name="logo" accept="image/jpeg,image/png"/></label>
      {org && <label><input type="checkbox" name="remove_logo"/> {es?"Quitar logo":"Remove logo"}</label>}
      <p>{es?"Los cambios en una ficha publicada la devuelven a revisión.":"Changes to a published listing return it to review."}</p>
      <button className="button button-dark">{es?"Enviar a revisión":"Submit for review"}</button>
    </form>;
  }
  return <main className="account-page"><div className="account account-narrow">
    <Breadcrumbs lang={lang} parent="espacio" current={title}/><h1>{title}</h1>
    {result && <p role="status">{result==="saved"?(es?"Ficha guardada.":"Listing saved."):result==="logo"?(es?"Usá PNG o JPG de hasta 128 KB.":"Use a PNG or JPG up to 128 KB."):(es?"No se guardó. Revisá los datos y el estado de la ficha.":"Unable to save. Check the fields and listing status.")}</p>}
    <details><summary>{es?"Registrar organización":"Register organization"}</summary>{form()}</details>
    {error && <p role="alert">{es?"No se pudieron cargar las fichas.":"Unable to load listings."}</p>}
    {(data as ManagedOrganization[]|null)?.map(org=><details key={org.id}><summary>{org.name} · {statusLabel(org.status,es)}</summary>{form(org)}</details>)}
  </div></main>;
}
