import Link from "next/link";
import { Breadcrumbs } from "@/components/breadcrumbs";
import { notFound, redirect } from "next/navigation";
import { accountClient } from "@/lib/supabase/server";
import { isLocale } from "@/lib/i18n";

type Entry = { id:string; full_name:string; email:string; organization:string|null; title:string|null; applied_at:string; status:string; role:string };
const states = ["pending","approved","disabled"];
const roles = ["member","editor","admin"];

export default async function Admin({ params, searchParams }: {
  params:Promise<{lang:string}>; searchParams:Promise<{status?:string; result?:string}>;
}) {
  const {lang} = await params;
  if (!isLocale(lang)) notFound();
  const client = await accountClient();
  const {data:{user}} = await client.auth.getUser();
  if (!user) redirect("/"+lang+"/cuenta");
  if ((await client.rpc("is_cbiat_admin")).data !== true) notFound();
  const {status,result} = await searchParams;
  const {data,error} = await client.rpc("review_queue",{status_filter:states.includes(status ?? "") ? status : null});
  const [groupResult, assignmentResult] = await Promise.all([
    client.from("institutional_groups").select("id,name_es,name_en").order("name_es"),
    client.from("profile_groups").select("profile_id,group_id")
  ]);
  const es = lang === "es";
  const labels:Record<string,string> = es ? {pending:"Pendiente",approved:"Habilitada",disabled:"Deshabilitada",member:"Participante",editor:"Editor",admin:"Administrador"} : {pending:"Pending",approved:"Approved",disabled:"Disabled",member:"Participant",editor:"Editor",admin:"Administrator"};
  async function manageGroup(form: FormData) {
    "use server";
    const session = await accountClient();
    if ((await session.rpc("is_cbiat_admin")).data !== true) notFound();
    const operation = form.get("operation");
    let result;
    if (operation === "create") {
      const name_es = String(form.get("name_es") ?? "").trim();
      const name_en = String(form.get("name_en") ?? "").trim();
      if (!name_es || !name_en || name_es.length > 120 || name_en.length > 120) redirect("/"+lang+"/admin?result=error");
      result = await session.from("institutional_groups").insert({kind:"commission",name_es,name_en});
    } else {
      const profile_id = String(form.get("profile_id"));
      const group_id = String(form.get("group_id"));
      if (operation === "add") result = await session.from("profile_groups").upsert({profile_id,group_id}, {ignoreDuplicates:true});
      else if (operation === "remove") result = await session.from("profile_groups").delete().eq("profile_id", profile_id).eq("group_id", group_id);
      else redirect("/"+lang+"/admin?result=error");
    }
    redirect("/"+lang+"/admin?result="+(result.error ? "error" : "ok"));
  }
  async function review(form:FormData) {
    "use server";
    const session = await accountClient();
    const {error} = await session.rpc("review_account",{target:form.get("id"),account_status:form.get("status"),account_role:form.get("role")});
    redirect("/"+lang+"/admin?result="+(error?"error":"ok"));
  }
  return <main className="account-page"><div className="account"><Breadcrumbs lang={lang} parent="espacio" current={es ? "Administrar cuentas" : "Manage accounts"} /><h1>{es?"Administrar cuentas":"Manage accounts"}</h1>
    <Link href={`/${lang}/admin/organizaciones`}>{es ? "Revisar organizaciones →" : "Review organizations →"}</Link>
    <form><label>{es?"Estado":"Status"}<select name="status" defaultValue={status ?? ""}><option value="">{es?"Todos":"All"}</option>{states.map(s=><option key={s} value={s}>{labels[s]}</option>)}</select></label><button>{es?"Filtrar":"Filter"}</button></form>
    <details><summary>{es?"Crear comisión":"Create commission"}</summary>
      <form action={manageGroup}>
        <label>{es?"Nombre en español":"Spanish name"}<input name="name_es" maxLength={120} required/></label>
        <label>{es?"Nombre en inglés":"English name"}<input name="name_en" maxLength={120} required/></label>
        <button name="operation" value="create">{es?"Crear comisión":"Create commission"}</button>
      </form>
    </details>
    {result && <p role="status">{result==="ok"?(es?"Cambios guardados.":"Changes saved."):(es?"No se pudo guardar.":"Unable to save.")}</p>}
    {error && <p role="alert">{es?"No se pudo cargar la lista.":"Unable to load accounts."}</p>}
    {(data as Entry[]|null)?.map(p=><article key={p.id}><h2>{p.full_name || p.email}</h2><p>{[p.email,p.organization,p.title,new Date(p.applied_at).toLocaleDateString(lang)].filter(Boolean).join(" · ")}</p>
      {p.id===user.id?<p>{labels[p.status]} · {labels[p.role]}</p>:<form action={review}><input type="hidden" name="id" value={p.id}/>
        <label>{es?"Estado":"Status"}<select name="status" defaultValue={p.status}>{states.map(s=><option key={s} value={s}>{labels[s]}</option>)}</select></label>
        <label>{es?"Rol":"Role"}<select name="role" defaultValue={p.role}>{roles.map(s=><option key={s} value={s}>{labels[s]}</option>)}</select></label>
        <button className="button button-dark">{es?"Guardar":"Save"}</button></form>}
      {groupResult.error || assignmentResult.error ? <p role="alert">{es?"No se pudieron cargar las asignaciones.":"Unable to load assignments."}</p> :
        <details><summary>{es?"Junta y comisiones":"Board and commissions"}</summary>
          {groupResult.data?.map(group => {
            const assigned = assignmentResult.data?.some(row => row.profile_id === p.id && row.group_id === group.id);
            const name = es ? group.name_es : group.name_en;
            return <form key={group.id} action={manageGroup}>
              <input type="hidden" name="profile_id" value={p.id}/>
              <input type="hidden" name="group_id" value={group.id}/>
              <button name="operation" value={assigned ? "remove" : "add"}>{assigned ? (es?"Quitar":"Remove") : (es?"Asignar":"Assign")} · {name}</button>
            </form>;
          })}
        </details>}
    </article>)}</div></main>;
}
