import ExcelJS from "exceljs";
import { prisma } from "../../lib/prisma";

type ExcelCellValue = {
  text?: string;
  [key: string]: unknown;
};

type ImportResult = {
  totalRows: number;
  validRows: number;
  inserted: number;
  skippedExisting: number;
  skippedDuplicateInFile: number;
  invalidRows: number;
  samples: {
    invalid: Array<{ row: number; reason: string }>;
    duplicatesInFile: string[];
    alreadyExisting: string[];
  };
};

function cellToString(v: unknown): string {
  if (v === null || v === undefined) return "";
  if (typeof v === "object" && v && "text" in v) {
    return String((v as ExcelCellValue).text).trim();
  }
  return String(v).trim();
}

function normalizeRut(raw: string): string {
  return String(raw ?? "")
    .trim()
    .toUpperCase()
    .replace(/\./g, "")
    .replace(/-/g, "")
    .replace(/\s+/g, "");
}

function canonicalRut(raw: string): string {
  const n = normalizeRut(raw);
  if (n.length < 2) return n;
  return `${n.slice(0, -1)}-${n.slice(-1)}`;
}

export async function importClientsFromXlsx(
  buffer: Buffer | Uint8Array
): Promise<ImportResult> {
  const wb = new ExcelJS.Workbook();

  const buf = buffer instanceof Buffer ? buffer.buffer.slice(buffer.byteOffset, buffer.byteOffset + buffer.byteLength) : buffer;
  await wb.xlsx.load(buf);

  const ws = wb.worksheets[0];
  if (!ws) throw new Error("No worksheet found in file");

  const headerRow = ws.getRow(1);
  const headerMap = new Map<string, number>();

  headerRow.eachCell((cell, colNumber) => {
    const name = cellToString(cell.value);
    if (name) headerMap.set(name, colNumber);
  });

  const requiredHeaders = ["RutCliente", "RazonSocial", "Comuna", "Ciudad"];
  const missing = requiredHeaders.filter((h) => !headerMap.has(h));
  if (missing.length) {
    throw new Error(`Missing required columns: ${missing.join(", ")}`);
  }

  const totalRows = ws.rowCount - 1; 
  const invalid: Array<{ row: number; reason: string }> = [];

  type ClientRow = {
    rut: string;
    razonSocial: string;
    comuna: string;
    ciudad: string;
    giro?: string;
    telefono?: string;
    direccion?: string;
    isla?: string;
    active: boolean;
  };

  const parsed: Array<ClientRow | null> = [];

  for (let r = 2; r <= ws.rowCount; r++) {
    const row = ws.getRow(r);

    const rutRaw = cellToString(row.getCell(headerMap.get("RutCliente")!).value);
    const rut = canonicalRut(rutRaw);
    const razonSocial = cellToString(
      row.getCell(headerMap.get("RazonSocial")!).value
    );
    const comuna = cellToString(row.getCell(headerMap.get("Comuna")!).value);
    const ciudad = cellToString(row.getCell(headerMap.get("Ciudad")!).value);

    const giro = headerMap.get("Giro")
      ? cellToString(row.getCell(headerMap.get("Giro")!).value)
      : "";

    const telefono = headerMap.get("Telefono")
      ? cellToString(row.getCell(headerMap.get("Telefono")!).value)
      : "";

    if (!rut || !razonSocial || !comuna || !ciudad) {
      invalid.push({
        row: r,
        reason:
          "Faltan campos obligatorios (RutCliente, RazonSocial, Comuna o Ciudad)",
      });
      parsed.push(null);
      continue;
    }

    const item: ClientRow = {
      rut,
      razonSocial,
      comuna,
      ciudad,
      active: true,
    };

    if (giro) item.giro = giro;
    if (telefono) item.telefono = telefono;

    parsed.push(item);
  }

  const valid = parsed.filter(Boolean) as ClientRow[];

  const seen = new Set<string>();
  const duplicatesInFile: string[] = [];
  const unique: ClientRow[] = [];

  for (const item of valid) {
    if (seen.has(item.rut)) {
      duplicatesInFile.push(item.rut);
      continue;
    }
    seen.add(item.rut);
    unique.push(item);
  }

  const wanted = unique.map((x) => normalizeRut(x.rut));
  const rutVariants = new Set<string>();
  for (const r of wanted) {
    rutVariants.add(r);
    rutVariants.add(canonicalRut(r));
  }

  const existing = await prisma.client.findMany({
    where: { rut: { in: Array.from(rutVariants) } },
    select: { rut: true },
  });

  const existingNorm = new Set(existing.map((e) => normalizeRut(e.rut)));
  const toInsert = unique.filter((x) => !existingNorm.has(normalizeRut(x.rut)));

  const matchedExisting = new Set(wanted.filter((r) => existingNorm.has(r)));

  const createRes = await prisma.client.createMany({
    data: toInsert,
    skipDuplicates: true,
  });

  return {
    totalRows,
    validRows: valid.length,
    inserted: createRes.count,
    skippedExisting: matchedExisting.size,
    skippedDuplicateInFile: duplicatesInFile.length,
    invalidRows: invalid.length,
    samples: {
      invalid: invalid.slice(0, 20),
      duplicatesInFile: duplicatesInFile.slice(0, 20),
      alreadyExisting: Array.from(matchedExisting).slice(0, 20).map((r) => canonicalRut(r)),
    },
  };
}
