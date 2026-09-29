import { PDFDocument, StandardFonts, rgb } from 'pdf-lib';
import QRCode from 'qrcode';
import { NextResponse } from 'next/server';

import { appUrl } from '@/lib/url';
import { supabase } from '@/lib/supabase';
import type { Certificate, Event, Profile } from '@/lib/types';

export const dynamic = 'force-dynamic';

const CERT_LABELS: Record<string, string> = {
  participation: 'Certificate of Participation',
  winner: 'Winner Certificate',
  runner_up: 'Runner-up Certificate',
  volunteer: 'Volunteer Certificate',
  speaker: 'Speaker Certificate',
  judge: 'Judge Certificate',
};

type CertRow = Certificate & {
  events: Pick<Event, 'name' | 'starts_at'> | null;
  profiles: Pick<Profile, 'full_name'> | null;
};

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ code: string }> },
) {
  const { code } = await params;
  const { data: cert } = await supabase()
    .from('certificates')
    .select('*, events(name, starts_at), profiles(full_name)')
    .eq('cert_code', code.toUpperCase())
    .maybeSingle<CertRow>();
  if (!cert) return new NextResponse('Not found', { status: 404 });

  const base = await appUrl();
  const verifyUrl = `${base}/verify/${cert.cert_code}`;
  const qrData = await QRCode.toBuffer(verifyUrl, {
    width: 160,
    margin: 1,
    errorCorrectionLevel: 'M',
  });

  const pdf = await PDFDocument.create();
  // A4 landscape
  const page = pdf.addPage([842, 595]);
  const bold = await pdf.embedFont(StandardFonts.HelveticaBold);
  const regular = await pdf.embedFont(StandardFonts.Helvetica);
  const qr = await pdf.embedPng(qrData);
  const { width, height } = page.getSize();

  const slate = rgb(0.12, 0.16, 0.22);
  const accent = rgb(0.31, 0.27, 0.9);

  page.drawRectangle({
    x: 24,
    y: 24,
    width: width - 48,
    height: height - 48,
    borderColor: accent,
    borderWidth: 2,
  });

  const center = (text: string, y: number, size: number, font = regular, color = slate) => {
    const w = font.widthOfTextAtSize(text, size);
    page.drawText(text, { x: (width - w) / 2, y, size, font, color });
  };

  center('GATHERLY', height - 90, 14, bold, accent);
  center(CERT_LABELS[cert.type] ?? 'Certificate', height - 150, 30, bold);
  center('This certifies that', height - 195, 12, regular);
  center(cert.profiles?.full_name ?? 'Recipient', height - 245, 26, bold);
  center('participated in', height - 285, 12, regular);
  center(cert.events?.name ?? 'Event', height - 325, 20, bold, accent);

  const dateStr = cert.events?.starts_at
    ? new Date(cert.events.starts_at).toLocaleDateString('en-US', {
        month: 'long',
        day: 'numeric',
        year: 'numeric',
      })
    : '';
  if (dateStr) center(dateStr, height - 360, 12, regular);

  page.drawImage(qr, { x: 60, y: 50, width: 90, height: 90 });
  page.drawText(`Verify: ${cert.cert_code}`, {
    x: 60,
    y: 40,
    size: 9,
    font: regular,
    color: slate,
  });
  page.drawText(verifyUrl, {
    x: width - 60 - regular.widthOfTextAtSize(verifyUrl, 9),
    y: 40,
    size: 9,
    font: regular,
    color: slate,
  });
  page.drawText(
    `Issued ${new Date(cert.issued_at).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}`,
    { x: width - 250, y: 60, size: 10, font: regular, color: slate },
  );

  const bytes = await pdf.save();
  return new NextResponse(Buffer.from(bytes), {
    headers: {
      'Content-Type': 'application/pdf',
      'Content-Disposition': `inline; filename="certificate-${cert.cert_code}.pdf"`,
    },
  });
}
