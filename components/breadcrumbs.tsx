import Link from "next/link";
import type { Locale } from "@/lib/i18n";
import styles from "./breadcrumbs.module.css";

type Props = {
  lang: Locale;
  current: string;
  parent?: "espacio" | "cuenta";
};

export function Breadcrumbs({ lang, current, parent }: Props) {
  const es = lang === "es";
  const labels = { espacio: es ? "Espacio de la Cámara" : "Chamber space", cuenta: es ? "Mi cuenta" : "My account" };
  return (
    <nav className={styles.trail} aria-label={es ? "Ruta de navegación" : "Breadcrumb"}>
      <ol>
        <li><Link href={`/${lang}`}>{es ? "Inicio" : "Home"}</Link></li>
        {parent && <li><span aria-hidden="true">/</span><Link href={`/${lang}/${parent}`}>{labels[parent]}</Link></li>}
        <li><span aria-hidden="true">/</span><span aria-current="page">{current}</span></li>
      </ol>
    </nav>
  );
}
