"use server";
import { socialNetwork } from "@/lib/profile-links";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { accountClient } from "@/lib/supabase/server";

function value(form: FormData, key: string) {
  return String(form.get(key) ?? "").trim();
}

export async function submitAccount(form: FormData) {
  const lang = form.get("lang") === "en" ? "en" : "es";
  const path = "/" + lang + "/cuenta";
  const client = await accountClient();
  const action = form.get("action");
  if (action === "logout") {
    const { error } = await client.auth.signOut({ scope: "local" });
    redirect(path + (error ? "?msg=error" : ""));
  }
  const email = value(form, "email");
  const password = String(form.get("password") ?? "");
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || !password || value(form, "website")) redirect(path + "?msg=invalid");
  if (action === "register") {
    const name = value(form, "full_name");
    if (!name || name.length > 150 || password.length < 8) redirect(path + "?msg=invalid");
    const origin = (await headers()).get("origin");
    const emailRedirectTo = origin ? new URL(path + "/confirmar", origin).toString() : undefined;
    const { data, error } = await client.auth.signUp({ email, password, options: { emailRedirectTo, data: { full_name: name } } });
    if (error) redirect(path + "?msg=error");
    redirect(path + (data.session ? "" : "/verificar"));
  }
  if (action !== "login") redirect(path + "?msg=invalid");
  const { error } = await client.auth.signInWithPassword({ email, password });
  if (error?.code === "email_not_confirmed") redirect(path + "/verificar");
  redirect(path + (error ? "?msg=error" : ""));
}

export async function saveProfile(form: FormData) {
  const lang = form.get("lang") === "en" ? "en" : "es";
  const path = "/" + lang + "/cuenta";
  const client = await accountClient();
  const { data: { user } } = await client.auth.getUser();
  if (!user) redirect(path);
  const full_name = value(form, "full_name");
  const biography = value(form, "biography");
  const linkedin = value(form, "linkedin");
  const x = value(form, "x");
  if ((linkedin && socialNetwork(linkedin) !== "LinkedIn") || (x && socialNetwork(x) !== "X")) redirect(path + "?msg=invalid");
  const other = value(form, "social_links").split(/\r?\n/).map(s => s.trim()).filter(Boolean);
  const social_links = Array.from(new Set([linkedin, x, ...other].filter(Boolean)));
  const fields = { organization: value(form,"organization"), title: value(form,"title"), phone: value(form,"phone") };
  if (!full_name || full_name.length > 150 || biography.length > 2000 || Object.values(fields).some(s => s.length > 200) ||
      social_links.length > 8 || social_links.some(s => { try { return s.length > 2048 || !["https:", "http:"].includes(new URL(s).protocol); } catch { return true; } })) redirect(path + "?msg=invalid");
  const { error } = await client.from("profiles").update({ full_name, biography, social_links, ...fields,
    is_public: form.get("is_public") === "on" }).eq("id", user.id).select("id").single();
  redirect(path + (error ? "?msg=error" : "?msg=saved"));
}
