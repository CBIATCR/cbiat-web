import { profileLinks } from "@/lib/profile-links";
import Link from "next/link";
import { notFound } from "next/navigation";
import { isLocale } from "@/lib/i18n";
import { accountClient } from "@/lib/supabase/server";
import { submitAccount, saveProfile, changePhoto } from "@/app/actions/account";

export const dynamic = "force-dynamic";

export default async function Account({ params, searchParams }: {
  params: Promise<{ lang: string }>; searchParams: Promise<{ msg?: string }>;
}) {
  const { lang } = await params;
  if (!isLocale(lang)) notFound();
  const t = (es: string, en: string) => lang === "es" ? es : en;
  const messages: Record<string, string> = {
    invalid: t("Revisá los datos del formulario.", "Check the form fields."),
    error: t("No se pudo completar la operación. Revisá tus datos e intentá de nuevo.", "We could not complete the request. Check your details and try again."),
    verify: t("Revisá tu correo, confirmá la cuenta y luego iniciá sesión aquí.", "Check your email, confirm your account, then sign in here."),
    signin: t("Iniciá sesión con tu correo y contraseña. Si todavía no confirmaste el correo, revisá el enlace recibido.", "Sign in with your email and password. If you have not confirmed your email yet, check your confirmation link."),
    photo: t("Usá una foto JPG o PNG de hasta 512 KB.", "Choose a JPG or PNG photo up to 512 KB."),
    saved: t("Perfil guardado.", "Profile saved."),
  };
  const msg = messages[(await searchParams).msg ?? ""];
  const title = t("Mi cuenta", "My account");
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY)
    return <main className="account-page"><div className="account account-narrow"><h1>{title}</h1><p>{t("El acceso está temporalmente fuera de servicio.", "Account access is temporarily unavailable.")}</p></div></main>;
  const client = await accountClient();
  const { data: { user } } = await client.auth.getUser();
  const { data: profile } = user ? await client.from("profiles").select("*").eq("id", user.id).single() : { data: null };
  const links = profileLinks(profile?.social_links ?? []);
  const photo = user ? (await client.from("profile_photos").select("profile_id").eq("profile_id", user.id).maybeSingle()).data : null;
  const language = <input type="hidden" name="lang" value={lang} />;
  return <main className="account-page"><div className={user ? "account account-narrow" : "account"}>
    <h1>{title}</h1>{msg && <p role="status">{msg}</p>}
    {!user ? <div className="account-columns">{["login", "register"].map(action => {
      const register = action === "register";
      const label = register ? t("Crear cuenta","Create account") : t("Iniciar sesión","Sign in");
      return <form action={submitAccount} key={action}>
        <h2>{label}</h2>{language}<input type="hidden" name="action" value={action}/>
        <input hidden aria-hidden="true" tabIndex={-1} name="website" autoComplete="off"/>
        {register && <label>{t("Nombre completo","Full name")}<input name="full_name" maxLength={150} required autoComplete="name"/></label>}
        <label>{t("Correo","Email")}<input name="email" type="email" required autoComplete="email"/></label>
        <label>{t("Contraseña","Password")}<input name="password" type="password" required minLength={register ? 8 : undefined} autoComplete={register ? "new-password" : "current-password"}/></label>
        {register && <small>{t("Usá al menos 8 caracteres.","Use at least 8 characters.")}</small>}
        <button className="button button-dark">{label}</button>
      </form>;
    })}</div> : <>
      <p>{user.email}</p>
      <p>{!profile ? t("No se pudo cargar tu perfil.","Your profile could not be loaded.") : profile.status === "approved" ? t("Cuenta habilitada.","Account approved.") : profile.status === "pending" ? t("Tu cuenta está en revisión. Podés completar tu perfil mientras esperás.","Your account is under review. You can complete your profile while you wait.") : t("Tu cuenta está deshabilitada.","Your account is disabled.")}</p>
      {profile && ["approved","pending"].includes(profile.status) && <section>
        <h2>{t("Foto de perfil","Profile photo")}</h2>
        {photo && <img src={`/api/profile-photo/${profile.id}`} alt={profile.full_name} width={96} height={96} style={{objectFit:"cover",borderRadius:"50%"}}/>}
        <form action={changePhoto}>
          {language}
          <label>{t("Foto JPG o PNG, hasta 512 KB","JPG or PNG photo, up to 512 KB")}<input type="file" accept="image/jpeg,image/png" name="photo" required/></label>
          <button className="button button-dark">{t("Guardar foto","Save photo")}</button>
        </form>
        {photo && <form action={changePhoto}>{language}<button name="operation" value="remove">{t("Quitar foto","Remove photo")}</button></form>}
      </section>}
      {profile && ["approved","pending"].includes(profile.status) && <form className="profile-fields" action={saveProfile}>
        <h2>{t("Mi perfil","My profile")}</h2>{language}
        {Object.entries({ full_name: t("Nombre completo","Full name"), organization: t("Organización","Organization"), title: t("Cargo","Job title"), phone: t("Teléfono privado","Private phone") }).map(([key,label]) =>
          <label key={key}>{label}<input name={key} defaultValue={profile[key] ?? ""} required={key === "full_name"} maxLength={key === "full_name" ? 150 : 200}/></label>)}
        <label>{t("Biografía","Bio")}<textarea name="biography" defaultValue={profile.biography ?? ""} maxLength={2000}/></label>
        <label>LinkedIn<input type="url" name="linkedin" placeholder="https://www.linkedin.com/in/…" defaultValue={links.linkedin} maxLength={2048}/></label>
        <label>X<input type="url" name="x" placeholder="https://x.com/…" defaultValue={links.x} maxLength={2048}/></label>
        {links.other.length > 0 && <label>{t("Otros enlaces (uno por línea)","Other links (one per line)")}<textarea name="social_links" defaultValue={links.other.join("\n")}/></label>}
        <label><input type="checkbox" name="is_public" defaultChecked={profile.is_public}/> {t("Mostrar mi perfil en el directorio cuando mi cuenta esté habilitada","List my profile in the directory when my account is approved")}</label>
        <button className="button button-dark">{t("Guardar perfil","Save profile")}</button>
      </form>}
      {profile?.status === "approved" && profile.role === "admin" && <Link href={`/${lang}/admin`}>{t("Administrar cuentas","Manage accounts")}</Link>}
      {profile?.status === "approved" && <Link href={`/${lang}/espacio`}>{t("Ir al espacio de la Cámara","Visit the Chamber space")}</Link>}
      <form action={submitAccount}>{language}<button className="button" name="action" value="logout">{t("Cerrar sesión","Sign out")}</button></form>
    </>}
  </div></main>;
}
