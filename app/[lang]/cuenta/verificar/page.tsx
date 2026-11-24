import { Breadcrumbs } from "@/components/breadcrumbs";
import Link from "next/link";
import { notFound } from "next/navigation";
import { isLocale } from "@/lib/i18n";

export default async function VerifyEmail({ params }: { params: Promise<{ lang: string }> }) {
  const { lang } = await params;
  if (!isLocale(lang)) notFound();
  const es = lang === "es";
  return <main className="account-page"><div className="account account-narrow">
    <Breadcrumbs lang={lang} parent="cuenta" current={es ? "Confirmar correo" : "Confirm email"} />
    <h1>{es ? "Confirmá tu correo" : "Confirm your email"}</h1>
    <p>{es ? "Abrí el mensaje de confirmación y seguí el enlace para continuar con tu perfil. Si no lo ves, revisá la carpeta de spam." : "Open the confirmation email and follow the link to continue to your profile. Check your spam folder if needed."}</p>
    <Link href={`/${lang}/cuenta`}>{es ? "Ya confirmé mi correo · Iniciar sesión" : "I confirmed my email · Sign in"}</Link>
  </div></main>;
}
