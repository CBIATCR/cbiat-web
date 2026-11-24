import Link from "next/link";
import styles from "@/app/[lang]/miembros/directory.module.css";

export function DirectoryTabs({lang,active}:{lang:string;active:"miembros"|"organizaciones"}) {
  const es=lang==="es";
  return <nav className={styles.filters} aria-label={es?"Secciones del directorio":"Directory sections"}>
    <Link href={`/${lang}/miembros`} aria-current={active==="miembros"?"page":undefined}>{es?"Personas":"People"}</Link>
    <Link href={`/${lang}/organizaciones`} aria-current={active==="organizaciones"?"page":undefined}>{es?"Organizaciones":"Organizations"}</Link>
  </nav>;
}
