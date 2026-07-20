import { cookies } from "next/headers";

// Which store a SUPERUSER is currently viewing. SUPERUSER accounts have no
// tenantId of their own — this cookie is their "effective store" for the portal.
export const SU_STORE_COOKIE = "su_store";

export async function getSelectedStoreId(): Promise<string | null> {
  const jar = await cookies();
  return jar.get(SU_STORE_COOKIE)?.value ?? null;
}

export async function setSelectedStoreId(id: string): Promise<void> {
  const jar = await cookies();
  jar.set(SU_STORE_COOKIE, id, {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    secure: process.env.NODE_ENV === "production",
  });
}
