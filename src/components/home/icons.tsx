// Compact line-icon set for the luxury homepage. Stroke = currentColor so a
// gold wrapper tints them. 24x24, 1.6 stroke.
import type { SVGProps } from "react";

type P = SVGProps<SVGSVGElement>;
const base = {
  width: 24, height: 24, viewBox: "0 0 24 24", fill: "none",
  stroke: "currentColor", strokeWidth: 1.6, strokeLinecap: "round" as const, strokeLinejoin: "round" as const,
};

export const Icon = {
  booking: (p: P) => (<svg {...base} {...p}><rect x="3" y="4.5" width="18" height="16" rx="2.5" /><path d="M3 9h18M8 3v3M16 3v3" /><path d="m9 14 2 2 4-4" /></svg>),
  customers: (p: P) => (<svg {...base} {...p}><circle cx="9" cy="8" r="3" /><path d="M3.5 20a5.5 5.5 0 0 1 11 0" /><path d="M16 6.2a3 3 0 0 1 0 5.6M18.5 20a5.2 5.2 0 0 0-3-4.7" /></svg>),
  payments: (p: P) => (<svg {...base} {...p}><rect x="2.5" y="5" width="19" height="14" rx="2.5" /><path d="M2.5 9.5h19M6 15h4" /></svg>),
  analytics: (p: P) => (<svg {...base} {...p}><path d="M4 20V4M4 20h16" /><path d="M8 20v-6M12.5 20V9M17 20v-9" /></svg>),
  inventory: (p: P) => (<svg {...base} {...p}><path d="m12 3 8 4.5v9L12 21l-8-4.5v-9L12 3Z" /><path d="m4 7.5 8 4.5 8-4.5M12 12v9" /></svg>),
  staff: (p: P) => (<svg {...base} {...p}><circle cx="12" cy="7.5" r="3.2" /><path d="M5.5 20a6.5 6.5 0 0 1 13 0" /></svg>),
  marketing: (p: P) => (<svg {...base} {...p}><path d="M4 9v6l11 4V5L4 9Z" /><path d="M15 8.5a3.5 3.5 0 0 1 0 7M7 15v3.5a1.5 1.5 0 0 0 3 0V16" /></svg>),
  loyalty: (p: P) => (<svg {...base} {...p}><path d="M12 20s-7-4.3-7-9.4A3.9 3.9 0 0 1 12 8a3.9 3.9 0 0 1 7 2.6C19 15.7 12 20 12 20Z" /></svg>),
  memberships: (p: P) => (<svg {...base} {...p}><circle cx="12" cy="9" r="4.5" /><path d="m8.5 13-1 7 4.5-2.4L16.5 20l-1-7" /></svg>),
  reports: (p: P) => (<svg {...base} {...p}><path d="M6 3h8l4 4v14H6V3Z" /><path d="M14 3v4h4M9 13h6M9 17h6M9 9h2" /></svg>),
  notifications: (p: P) => (<svg {...base} {...p}><path d="M18 8a6 6 0 1 0-12 0c0 6-2 7-2 7h16s-2-1-2-7Z" /><path d="M10.5 20a2 2 0 0 0 3 0" /></svg>),
  profiles: (p: P) => (<svg {...base} {...p}><rect x="3" y="4" width="18" height="16" rx="2.5" /><circle cx="9" cy="10" r="2.3" /><path d="M5.5 17a3.7 3.7 0 0 1 7 0M14 9h4M14 13h4" /></svg>),
  // How-it-works
  userPlus: (p: P) => (<svg {...base} {...p}><circle cx="9" cy="8" r="3.2" /><path d="M3.5 20a5.6 5.6 0 0 1 11 0M18 8v6M15 11h6" /></svg>),
  calendar: (p: P) => (<svg {...base} {...p}><rect x="3" y="4.5" width="18" height="16" rx="2.5" /><path d="M3 9h18M8 3v3M16 3v3m-8 8h3" /></svg>),
  growth: (p: P) => (<svg {...base} {...p}><path d="M4 20 10 13l3.5 3.5L20 8" /><path d="M15 8h5v5" /></svg>),
  // small
  check: (p: P) => (<svg {...base} {...p}><path d="m4 12 5 5L20 6" /></svg>),
  star: (p: P) => (<svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" {...p}><path d="m12 2 2.9 6.1 6.6.9-4.8 4.6 1.2 6.6L12 17.8 6.1 20.8l1.2-6.6L2.5 9l6.6-.9L12 2Z" /></svg>),
  arrow: (p: P) => (<svg {...base} {...p}><path d="M5 12h14M13 6l6 6-6 6" /></svg>),
  spark: (p: P) => (<svg {...base} {...p}><path d="M12 3v4M12 17v4M3 12h4M17 12h4M6 6l2.5 2.5M15.5 15.5 18 18M18 6l-2.5 2.5M8.5 15.5 6 18" /></svg>),
  shield: (p: P) => (<svg {...base} {...p}><path d="M12 3 5 6v5c0 4.4 3 8.3 7 10 4-1.7 7-5.6 7-10V6l-7-3Z" /><path d="m9 12 2 2 4-4" /></svg>),
  scissors: (p: P) => (<svg {...base} {...p}><circle cx="6" cy="6" r="2.5" /><circle cx="6" cy="18" r="2.5" /><path d="M8 8l12 8M8 16 20 8M8.5 7.5 12 12" /></svg>),
};

export type IconName = keyof typeof Icon;
