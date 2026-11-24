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
  const es = lang === "es";
  const labels:Record<string,string> = es ? {pending:"Pendiente",approved:"Habilitada",disabled:"Deshabilitada",member:"Participante",editor:"Editor",admin:"Administrador"} : {pending:"Pending",approved:"Approved",disabled:"Disabled",member:"Participant",editor:"Editor",admin:"Administrator"};
  async function review(form:FormData) {
    "use server";
    const session = await accountClient();
    const {error} = await session.rpc("review_account",{target:form.get("id"),account_status:form.get("status"),account_role:form.get("role")});
    redirect("/"+lang+"/admin?result="+(error?"error":"ok"));
  }
  return <main className="account-page"><div className="account"><h1>{es?"Administrar cuentas":"Manage accounts"}</h1>
    <form><label>{es?"Estado":"Status"}<select name="status" defaultValue={status ?? ""}><option value="">{es?"Todos":"All"}</option>{states.map(s=><option key={s} value={s}>{labels[s]}</option>)}</select></label><button>{es?"Filtrar":"Filter"}</button></form>
    {result && <p role="status">{result==="ok"?(es?"Cambios guardados.":"Changes saved."):(es?"No se pudo guardar.":"Unable to save.")}</p>}
    {error && <p role="alert">{es?"No se pudo cargar la lista.":"Unable to load accounts."}</p>}
    {(data as Entry[]|null)?.map(p=><article key={p.id}><h2>{p.full_name || p.email}</h2><p>{[p.email,p.organization,p.title,new Date(p.applied_at).toLocaleDateString(lang)].filter(Boolean).join(" · ")}</p>
      {p.id===user.id?<p>{labels[p.status]} · {labels[p.role]}</p>:<form action={review}><input type="hidden" name="id" value={p.id}/>
        <label>{es?"Estado":"Status"}<select name="status" defaultValue={p.status}>{states.map(s=><option key={s} value={s}>{labels[s]}</option>)}</select></label>
        <label>{es?"Rol":"Role"}<select name="role" defaultValue={p.role}>{roles.map(s=><option key={s} value={s}>{labels[s]}</option>)}</select></label>
        <button className="button button-dark">{es?"Guardar":"Save"}</button></form>}
    </article>)}</div></main>;
}
