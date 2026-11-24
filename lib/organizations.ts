export const kinds = {
  company: ["Empresa", "Company"], startup: ["Startup", "Startup"],
  academia: ["Academia", "Academia"], institution: ["Institución", "Institution"],
  investor: ["Inversionista", "Investor"], other: ["Otra", "Other"],
} as const;

export type Organization = {
  id: string; name: string; description: string; kind: keyof typeof kinds;
  website: string; location: string; logo: string | null; partner: boolean;
};
export type ManagedOrganization = Organization & { revision: number; status: "pending" | "approved" | "rejected" };
export function statusLabel(status: ManagedOrganization["status"], es: boolean) {
  return { pending: es ? "En revisión" : "Under review", approved: es ? "Publicada" : "Published", rejected: es ? "Rechazada" : "Rejected" }[status];
}
