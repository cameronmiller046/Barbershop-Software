// Renders premium social-media icon links for whichever URLs the shop owner has
// set in Shop Settings → Website Content → Social & SEO. Any left blank are hidden.
type Social = { label: string; href: string | null | undefined; d: string; fill?: boolean };

export function SocialLinks({
  instagram, facebook, tiktok, x, youtube, website, className = "",
}: {
  instagram?: string | null; facebook?: string | null; tiktok?: string | null;
  x?: string | null; youtube?: string | null; website?: string | null; className?: string;
}) {
  const items: Social[] = [
    { label: "Instagram", href: instagram, d: "M12 2.2c3.2 0 3.6 0 4.8.07 1.2.05 1.8.25 2.2.4.5.2.9.5 1.3.9.4.4.7.8.9 1.3.15.4.35 1 .4 2.2.07 1.2.07 1.6.07 4.8s0 3.6-.07 4.8c-.05 1.2-.25 1.8-.4 2.2-.2.5-.5.9-.9 1.3-.4.4-.8.7-1.3.9-.4.15-1 .35-2.2.4-1.2.07-1.6.07-4.8.07s-3.6 0-4.8-.07c-1.2-.05-1.8-.25-2.2-.4a3.5 3.5 0 0 1-1.3-.9 3.5 3.5 0 0 1-.9-1.3c-.15-.4-.35-1-.4-2.2C2.2 15.6 2.2 15.2 2.2 12s0-3.6.07-4.8c.05-1.2.25-1.8.4-2.2.2-.5.5-.9.9-1.3.4-.4.8-.7 1.3-.9.4-.15 1-.35 2.2-.4C8.4 2.2 8.8 2.2 12 2.2Zm0 3.4a6.4 6.4 0 1 0 0 12.8 6.4 6.4 0 0 0 0-12.8Zm0 2.2a4.2 4.2 0 1 1 0 8.4 4.2 4.2 0 0 1 0-8.4Zm6.6-.3a1.5 1.5 0 1 1-3 0 1.5 1.5 0 0 1 3 0Z" },
    { label: "Facebook", href: facebook, d: "M22 12a10 10 0 1 0-11.6 9.9v-7H7.9V12h2.5V9.8c0-2.5 1.5-3.9 3.8-3.9 1.1 0 2.2.2 2.2.2v2.5h-1.3c-1.2 0-1.6.8-1.6 1.6V12h2.8l-.4 2.9h-2.4v7A10 10 0 0 0 22 12Z" },
    { label: "TikTok", href: tiktok, d: "M16.5 3c.3 2 1.6 3.6 3.5 3.9v2.7a6.6 6.6 0 0 1-3.5-1.1v5.9a5.7 5.7 0 1 1-5.7-5.7c.3 0 .6 0 .9.06v2.8a3 3 0 1 0 2 2.8V3h2.8Z" },
    { label: "X", href: x, d: "M18.9 2H22l-7.6 8.7L23 22h-6.8l-5.3-6.9L4.8 22H2l8.1-9.3L1.7 2h6.9l4.8 6.4L18.9 2Zm-2.4 18h1.9L7.6 4H5.6l10.9 16Z" },
    { label: "YouTube", href: youtube, d: "M22 8.2a3 3 0 0 0-2.1-2.1C18 5.5 12 5.5 12 5.5s-6 0-7.9.6A3 3 0 0 0 2 8.2 31 31 0 0 0 1.6 12 31 31 0 0 0 2 15.8a3 3 0 0 0 2.1 2.1c1.9.6 7.9.6 7.9.6s6 0 7.9-.6a3 3 0 0 0 2.1-2.1A31 31 0 0 0 22.4 12 31 31 0 0 0 22 8.2ZM10 15.1V8.9l5.2 3.1L10 15.1Z" },
    { label: "Website", href: website, d: "M12 2a10 10 0 1 0 0 20 10 10 0 0 0 0-20Zm6.9 6h-2.9a15.7 15.7 0 0 0-1.3-3.4A8 8 0 0 1 18.9 8ZM12 4c.8 1.1 1.4 2.5 1.8 4h-3.6c.4-1.5 1-2.9 1.8-4ZM4.3 14a8 8 0 0 1 0-4h3.2a17.5 17.5 0 0 0 0 4H4.3Zm.8 2H8c.3 1.2.7 2.4 1.3 3.4A8 8 0 0 1 5.1 16Zm2.9-8H5.1a8 8 0 0 1 4.2-3.4A15.7 15.7 0 0 0 8 8Zm4 12c-.8-1.1-1.4-2.5-1.8-4h3.6c-.4 1.5-1 2.9-1.8 4Zm2.2-6H9.8a15.6 15.6 0 0 1 0-4h4.4a15.6 15.6 0 0 1 0 4Zm.5 5.4c.6-1 1-2.2 1.3-3.4h2.9a8 8 0 0 1-4.2 3.4ZM16.5 14a17.5 17.5 0 0 0 0-4h3.2a8 8 0 0 1 0 4h-3.2Z" },
  ];
  const shown = items.filter((s) => s.href && s.href.trim());
  if (shown.length === 0) return null;
  return (
    <div className={`flex flex-wrap items-center gap-2.5 ${className}`}>
      {shown.map((s) => (
        <a key={s.label} href={s.href as string} target="_blank" rel="noreferrer" aria-label={s.label}
          className="grid h-9 w-9 place-items-center rounded-full border border-white/12 text-cream/60 transition hover:border-brass/50 hover:text-brass">
          <svg width="17" height="17" viewBox="0 0 24 24" fill="currentColor"><path d={s.d} /></svg>
        </a>
      ))}
    </div>
  );
}
