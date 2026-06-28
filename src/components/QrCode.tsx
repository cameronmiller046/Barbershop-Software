import QRCode from "qrcode";

/** Server component: renders a QR code as an inline data-URL <img>. */
export async function QrCode({
  value,
  size = 220,
  dark = "#0f0f10",
  light = "#f5f1e8",
}: {
  value: string;
  size?: number;
  dark?: string;
  light?: string;
}) {
  const dataUrl = await QRCode.toDataURL(value, {
    width: size,
    margin: 1,
    color: { dark, light },
    errorCorrectionLevel: "M",
  });
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={dataUrl}
      alt="QR code to book an appointment"
      width={size}
      height={size}
      className="rounded-xl"
    />
  );
}
