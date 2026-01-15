import { prisma } from "../../lib/prisma";

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


type ListParams = {
  search?: string;
  comuna?: string;
  ciudad?: string;
  active?: boolean;
  take: number;
  skip: number;
};

export async function listClients(params: ListParams) {
  const { search, comuna, ciudad, active, take, skip } = params;

  const where: any = {};

  if (active !== undefined) where.active = active;
  if (comuna) where.comuna = comuna;
  if (ciudad) where.ciudad = ciudad;

  if (search) {
    where.OR = [
      { razonSocial: { contains: search } },
      { rut: { contains: search } },
      { comuna: { contains: search } },
      { ciudad: { contains: search } },
    ];
  }

  const [items, total] = await Promise.all([
    prisma.client.findMany({
      where,
      orderBy: { razonSocial: "asc" },
      take,
      skip,
    }),
    prisma.client.count({ where }),
  ]);

  return { items, total, take, skip };
}

type CreateClientInput = {
  rut: string;
  razonSocial: string;
  comuna: string;
  ciudad: string;
  giro?: string;
  telefono?: string;
  direccion?: string;
  isla?: string;
  active?: boolean;
  latitud?: number;
  longitud?: number;
};

export async function createClient(input: CreateClientInput) {
  const data: any = {
    rut: canonicalRut(input.rut),
    razonSocial: input.razonSocial.trim(),
    comuna: input.comuna.trim(),
    ciudad: input.ciudad.trim(),
    active: input.active ?? true,
  };

  if (input.giro?.trim()) data.giro = input.giro.trim();
  if (input.telefono?.trim()) data.telefono = input.telefono.trim();
  if (input.direccion?.trim()) data.direccion = input.direccion.trim();
  if (input.isla?.trim()) data.isla = input.isla.trim();

  if (typeof input.latitud === "number") data.latitud = input.latitud;
  if (typeof input.longitud === "number") data.longitud = input.longitud;

  return prisma.client.create({ data });
}

export async function updateClient(id: number, data: any) {
  if (data?.rut) {
    data.rut = canonicalRut(String(data.rut));
  }
  return await prisma.client.update({
    where: { id },
    data,
  });
}