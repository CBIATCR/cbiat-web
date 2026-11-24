"use server";
import { redirect } from "next/navigation";
import { accountClient } from "@/lib/supabase/server";
import { kinds } from "@/lib/organizations";

export async function submitOrganization(form: FormData) {
  const lang = form.get("lang") === "en" ? "en" : "es";
  const path = "/" + lang + "/espacio/organizaciones";
  const client = await accountClient();
  const { data: { user } } = await client.auth.getUser();
  if (!user) redirect("/"+lang+"/cuenta");
  const { data: profile } = await client.from("profiles").select("status").eq("id",user.id).single();
  if (profile?.status !== "approved") redirect("/"+lang+"/cuenta");
  const read = (key: string) => String(form.get(key) ?? "").trim();
  const fields = { name: read("name"), description: read("description"), location: read("location"), kind: read("kind"), website: read("website") };
  if (!fields.name || fields.name.length > 160 || !fields.description || fields.description.length > 1600 ||
      fields.location.length > 160 || !Object.hasOwn(kinds,fields.kind) || !URL.canParse(fields.website) ||
      !/^https?:\/\//.test(fields.website) || fields.website.length > 2048) redirect(path+"?result=invalid");
  const file = form.get("logo");
  let logo: string | null | undefined = form.has("remove_logo") ? null : undefined;
  if (file instanceof File && file.size) {
    if (file.size > 128*1024) redirect(path+"?result=logo");
    const bytes = Buffer.from(await file.arrayBuffer());
    const mime = bytes.subarray(0,8).toString("hex")==="89504e470d0a1a0a" ? "png" :
      bytes.subarray(0,3).toString("hex")==="ffd8ff" ? "jpeg" : null;
    if (!mime) redirect(path+"?result=logo");
    logo = "data:image/"+mime+";base64,"+bytes.toString("base64");
  }
  const payload = logo === undefined ? fields : {...fields,logo};
  const table = client.from("organizations");
  const id = read("id");
  const query = id ? table.update(payload).eq("id",id).eq("owner_id",user.id).eq("revision",read("revision")) : table.insert(payload);
  const {error} = await query.select("id").single();
  redirect(path+(error ? "?result=error" : "?result=saved"));
}
