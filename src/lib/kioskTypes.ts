// Shared kiosk shapes. Kept out of the "use server" actions file because such a
// file may only export async functions.
export type KioskClient = {
  id: string;
  name: string;
  phoneMasked: string | null;
  emailMasked: string | null;
  lastVisit: string | null; // ISO of most recent appointment, if any
};

export type BarberOption = {
  id: string;
  name: string;
  avatarUrl: string | null;
  etaMin: number | null;
};
