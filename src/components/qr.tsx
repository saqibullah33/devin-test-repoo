import QRCode from 'qrcode';

export async function QrImage({
  value,
  size = 240,
  label,
}: {
  value: string;
  size?: number;
  label?: string;
}) {
  const dataUrl = await QRCode.toDataURL(value, {
    width: size,
    margin: 1,
    errorCorrectionLevel: 'M',
  });
  return (
    <div className="flex flex-col items-center gap-2">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={dataUrl}
        alt={label ?? 'QR code'}
        width={size}
        height={size}
        className="rounded-md border border-slate-200"
      />
      {label ? (
        <p className="text-xs text-slate-500">{label}</p>
      ) : null}
    </div>
  );
}
