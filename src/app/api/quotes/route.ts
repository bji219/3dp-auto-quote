import { NextRequest, NextResponse } from 'next/server';
import { gunzipSync } from 'zlib';
import { z } from 'zod';
import { parseSTL, validateSTLData } from '@/utils/stl-parser';
import { calculateDetailedQuote, encodeQuoteMeta } from '@/utils/pricing';
import { saveFileWithMetadata, calculateFileHash } from '@/utils/file-storage';
import { prisma } from '@/lib/prisma';
import { MATERIALS, PUBLIC_PRICING } from '@/lib/quote-engine';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const MAX_FILE_SIZE = parseInt(process.env.MAX_FILE_SIZE_MB || '50') * 1024 * 1024;
const CONTACT = process.env.CONTACT_EMAIL || 'hello@idw3d.com';

const optionsSchema = z.object({
  material: z
    .string()
    .refine((m) => m in MATERIALS, 'Unknown material')
    .default('PLA'),
  quality: z.enum(['draft', 'standard', 'high']).default('standard'),
  infill: z.number().min(0).max(100).default(15),
  quantity: z.number().int().min(1).max(PUBLIC_PRICING.maxQuantity).default(1),
  rush: z.boolean().default(false),
  unitScale: z.number().positive().max(1000).default(1),
  color: z.string().max(60).optional(),
});

const fail = (status: number, message: string, extra: Record<string, unknown> = {}) =>
  NextResponse.json({ success: false, message, ...extra }, { status });

/**
 * POST /api/quotes
 *
 * Turns an instant (browser-side) quote into a saved, orderable one. The
 * price is always recomputed here from the uploaded file; nothing the client
 * says about price is trusted.
 *
 * multipart/form-data: file (STL, optionally gzipped with encoding=gzip),
 * options (JSON), website (honeypot).
 */
export async function POST(request: NextRequest) {
  let form: FormData;
  try {
    form = await request.formData();
  } catch {
    return fail(400, 'Expected a multipart form upload.');
  }

  if (form.get('website')) return fail(400, 'Invalid request');

  const file = form.get('file');
  if (!(file instanceof File) || file.size === 0) return fail(400, 'No STL file received.');
  const fileName = String(form.get('fileName') || file.name || 'model.stl').slice(0, 200);
  if (!fileName.toLowerCase().endsWith('.stl')) return fail(400, 'Only STL files are supported.');

  let optionsRaw: unknown = {};
  try {
    optionsRaw = JSON.parse(String(form.get('options') || '{}'));
  } catch {
    return fail(400, 'Options were not valid JSON.');
  }
  const parsed = optionsSchema.safeParse(optionsRaw);
  if (!parsed.success) return fail(400, 'Invalid print options.', { errors: parsed.error.errors });
  const opts = parsed.data;

  let buffer = Buffer.from(await file.arrayBuffer());
  if (form.get('encoding') === 'gzip') {
    try {
      buffer = gunzipSync(buffer, { maxOutputLength: MAX_FILE_SIZE });
    } catch {
      return fail(
        400,
        `Could not unpack the upload, or it exceeds ${MAX_FILE_SIZE / 1024 / 1024} MB.`
      );
    }
  }
  if (buffer.length > MAX_FILE_SIZE) {
    return fail(413, `File must be under ${MAX_FILE_SIZE / 1024 / 1024} MB.`);
  }

  const arrayBuffer = buffer.buffer.slice(
    buffer.byteOffset,
    buffer.byteOffset + buffer.byteLength
  ) as ArrayBuffer;
  const stlData = await parseSTL(arrayBuffer);
  const validation = validateSTLData(stlData);
  if (!validation.valid) return fail(422, validation.errors.join(' '));

  const quote = calculateDetailedQuote(stlData, {
    material: opts.material,
    quality: opts.quality,
    infillPercentage: opts.infill,
    quantity: opts.quantity,
    rushOrder: opts.rush,
    unitScale: opts.unitScale,
    shippingEnabled: true,
  });
  if (!quote.orderable) {
    const blocker = quote.warnings.find((w) => w.level === 'block');
    return fail(422, blocker?.message || 'This part needs a manual quote.', {
      code: 'manual_quote',
      contact: CONTACT,
    });
  }

  const ipAddress =
    request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || 'unknown';
  const userAgent = request.headers.get('user-agent') || 'unknown';

  try {
    const fileHash = await calculateFileHash(buffer);
    let fileRecord = await prisma.fileUpload.findFirst({ where: { fileHash } });
    if (fileRecord) {
      fileRecord = await prisma.fileUpload.update({
        where: { id: fileRecord.id },
        data: { lastAccessedAt: new Date() },
      });
    } else {
      const stored = await saveFileWithMetadata(fileName, buffer, undefined, ipAddress, userAgent);
      fileRecord = await prisma.fileUpload.create({
        data: {
          fileId: stored.fileId,
          fileName: stored.fileName,
          filePath: stored.filePath,
          fileSize: stored.fileSize,
          fileHash: stored.fileHash,
          mimeType: stored.mimeType,
          storageType: stored.storageType,
          volume: quote.model.volume,
          surfaceArea: quote.model.surfaceArea,
          boundingBox: JSON.stringify(quote.model.boundingBox),
          ipAddress,
          userAgent,
        },
      });
    }

    const saved = await prisma.quote.create({
      data: {
        email: 'anonymous@temp.local',
        emailVerified: false,
        fileId: fileRecord.fileId,
        fileName,
        filePath: fileRecord.filePath,
        fileSize: buffer.length,
        fileHash,
        volume: quote.model.volume,
        surfaceArea: quote.model.surfaceArea,
        boundingBox: encodeQuoteMeta(quote),
        material: opts.material,
        infillPercentage: Math.round(opts.infill),
        quality: opts.quality,
        color: opts.color || null,
        rushOrder: opts.rush,
        baseCost: quote.breakdown.setupFee,
        materialCost: quote.breakdown.materialCost,
        laborCost:
          quote.breakdown.laborCost +
          quote.breakdown.machineCost +
          quote.breakdown.complexitySurcharge,
        totalCost: quote.breakdown.total,
        status: 'pending',
        validUntil: quote.validUntil,
        ipAddress,
        userAgent,
      },
    });

    return NextResponse.json(
      {
        success: true,
        quote: {
          id: saved.id,
          total: quote.breakdown.total,
          quantity: quote.quantity,
          breakdown: quote.breakdown,
          validUntil: saved.validUntil.toISOString(),
        },
      },
      { status: 201 }
    );
  } catch (error) {
    // Database or storage is down. The customer still has their instant quote.
    console.error('Could not save quote:', error);
    return fail(
      503,
      `Online ordering is temporarily unavailable. Email your file to ${CONTACT} with the quote shown and we will take it from there.`,
      { code: 'unavailable', contact: CONTACT }
    );
  }
}
