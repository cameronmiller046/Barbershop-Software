// Neutral "?" image placeholder (dark card + muted-gold question mark). Shown
// wherever a shop hasn't uploaded its own image yet — no stock photography.
export const QMARK =
  "data:image/svg+xml," +
  encodeURIComponent(
    "<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'>" +
      "<rect width='100' height='100' fill='#14131a'/>" +
      "<text x='50' y='68' font-size='56' fill='#a98a4a' text-anchor='middle' font-family='Georgia, serif' font-weight='bold'>?</text>" +
    "</svg>",
  );
