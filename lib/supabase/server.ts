import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

export async function accountClient() {
  const jar = await cookies();
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    {
      cookies: {
        getAll: () => jar.getAll(),
        setAll: (entries) => {
          // Server Components read the cookies refreshed by the proxy.
          try {
            for (const { name, value, options } of entries) jar.set(name, value, options);
          } catch {
            // Cookie writes are supported in actions and route handlers.
          }
        },
      },
    }
  );
}
