import { db } from "@/lib/db";
import { slugify } from "@/lib/slug";

const FUEL_TYPES = new Set(["petrol", "diesel", "hybrid", "electric"]);
const TRANSMISSIONS = new Set(["manual", "automatic", "cvt"]);
const DRIVE_TYPES = new Set(["fwd", "rwd", "awd", "four_wd"]);
const BODY_TYPES = new Set(["sedan", "hatchback", "suv", "pickup", "van", "truck", "motorcycle"]);

function validationError(message) {
  return Response.json({ success: false, error: { code: "VALIDATION", message } }, { status: 400 });
}
function notFound(message = "Not found") {
  return Response.json({ success: false, error: { code: "NOT_FOUND", message } }, { status: 404 });
}
function conflict(message) {
  return Response.json({ success: false, error: { code: "CONFLICT", message } }, { status: 409 });
}

// ---------------- Makes ----------------

export async function listMakes({ search } = {}) {
  return db.vehicleMake.findMany({
    where: search ? { name: { contains: search, mode: "insensitive" } } : undefined,
    include: { _count: { select: { models: true } } },
    orderBy: { name: "asc" },
  });
}

export async function createMake({ name, logoUrl }) {
  if (!name?.trim()) return { error: validationError("name is required") };

  // Case-insensitive dedup check — this is shared reference data across
  // every seller, so "Toyota" and "toyota" being two separate rows would
  // silently split compatibility data between them.
  const existing = await db.vehicleMake.findFirst({ where: { name: { equals: name.trim(), mode: "insensitive" } } });
  if (existing) return { error: conflict(`Make "${existing.name}" already exists`) };

  let slug = slugify(name);
  let suffix = 2;
  while (await db.vehicleMake.findUnique({ where: { slug } })) {
    slug = `${slugify(name)}-${suffix++}`;
  }

  const make = await db.vehicleMake.create({ data: { name: name.trim(), slug, logoUrl: logoUrl || null } });
  return { data: make };
}

export async function updateMake(id, { name, logoUrl }) {
  const before = await db.vehicleMake.findUnique({ where: { id } });
  if (!before) return { error: notFound("Make not found") };

  const make = await db.vehicleMake.update({
    where: { id },
    data: {
      ...(name !== undefined ? { name } : {}),
      ...(logoUrl !== undefined ? { logoUrl } : {}),
    },
  });
  return { data: make, before };
}

export async function deleteMake(id) {
  const before = await db.vehicleMake.findUnique({ where: { id }, include: { _count: { select: { models: true } } } });
  if (!before) return { error: notFound("Make not found") };
  if (before._count.models > 0) {
    return { error: conflict("Delete or reassign this make's models first") };
  }
  await db.vehicleMake.delete({ where: { id } });
  return { data: before };
}

// ---------------- Models ----------------

export async function listModels({ makeId, search } = {}) {
  return db.vehicleModel.findMany({
    where: {
      ...(makeId ? { makeId } : {}),
      ...(search ? { name: { contains: search, mode: "insensitive" } } : {}),
    },
    include: { make: { select: { id: true, name: true } }, _count: { select: { generations: true } } },
    orderBy: { name: "asc" },
  });
}

export async function createModel({ makeId, name }) {
  if (!makeId || !name?.trim()) return { error: validationError("makeId and name are required") };

  const make = await db.vehicleMake.findUnique({ where: { id: makeId } });
  if (!make) return { error: notFound("Make not found") };

  const existing = await db.vehicleModel.findFirst({
    where: { makeId, name: { equals: name.trim(), mode: "insensitive" } },
  });
  if (existing) return { error: conflict(`Model "${existing.name}" already exists for ${make.name}`) };

  let slug = slugify(name);
  let suffix = 2;
  while (await db.vehicleModel.findUnique({ where: { makeId_slug: { makeId, slug } } })) {
    slug = `${slugify(name)}-${suffix++}`;
  }

  const model = await db.vehicleModel.create({ data: { makeId, name: name.trim(), slug } });
  return { data: model };
}

export async function updateModel(id, { name, makeId }) {
  const before = await db.vehicleModel.findUnique({ where: { id } });
  if (!before) return { error: notFound("Model not found") };

  const model = await db.vehicleModel.update({
    where: { id },
    data: {
      ...(name !== undefined ? { name } : {}),
      ...(makeId !== undefined ? { makeId } : {}),
    },
  });
  return { data: model, before };
}

export async function deleteModel(id) {
  const before = await db.vehicleModel.findUnique({ where: { id }, include: { _count: { select: { generations: true } } } });
  if (!before) return { error: notFound("Model not found") };
  if (before._count.generations > 0) {
    return { error: conflict("Delete or reassign this model's generations first") };
  }
  await db.vehicleModel.delete({ where: { id } });
  return { data: before };
}

// ---------------- Generations ----------------

export async function listGenerations({ modelId } = {}) {
  return db.vehicleGeneration.findMany({
    where: modelId ? { modelId } : undefined,
    include: { model: { select: { id: true, name: true } }, _count: { select: { trims: true } } },
    orderBy: { yearStart: "desc" },
  });
}

export async function createGeneration({ modelId, name, yearStart, yearEnd }) {
  if (!modelId || !name?.trim() || !yearStart) {
    return { error: validationError("modelId, name, and yearStart are required") };
  }
  const model = await db.vehicleModel.findUnique({ where: { id: modelId } });
  if (!model) return { error: notFound("Model not found") };

  const startYear = Number(yearStart);
  const endYear = yearEnd ? Number(yearEnd) : null;
  const currentYear = new Date().getFullYear();
  if (!Number.isFinite(startYear) || startYear < 1900 || startYear > currentYear + 1) {
    return { error: validationError("yearStart looks invalid") };
  }
  if (endYear && endYear < startYear) {
    return { error: validationError("yearEnd cannot be before yearStart") };
  }

  const generation = await db.vehicleGeneration.create({
    data: { modelId, name: name.trim(), yearStart: startYear, yearEnd: endYear },
  });
  return { data: generation };
}

export async function updateGeneration(id, { name, yearStart, yearEnd }) {
  const before = await db.vehicleGeneration.findUnique({ where: { id } });
  if (!before) return { error: notFound("Generation not found") };

  const generation = await db.vehicleGeneration.update({
    where: { id },
    data: {
      ...(name !== undefined ? { name } : {}),
      ...(yearStart !== undefined ? { yearStart: Number(yearStart) } : {}),
      ...(yearEnd !== undefined ? { yearEnd: yearEnd ? Number(yearEnd) : null } : {}),
    },
  });
  return { data: generation, before };
}

export async function deleteGeneration(id) {
  const before = await db.vehicleGeneration.findUnique({ where: { id }, include: { _count: { select: { trims: true } } } });
  if (!before) return { error: notFound("Generation not found") };
  if (before._count.trims > 0) {
    return { error: conflict("Delete or reassign this generation's trims first") };
  }
  await db.vehicleGeneration.delete({ where: { id } });
  return { data: before };
}

// ---------------- Trims ----------------

export async function listTrims({ generationId } = {}) {
  return db.vehicleTrim.findMany({
    where: generationId ? { generationId } : undefined,
    include: { generation: { select: { id: true, name: true } } },
    orderBy: { name: "asc" },
  });
}

function validateEnums({ fuelType, transmission, driveType, bodyType }) {
  if (fuelType != null && fuelType !== "" && !FUEL_TYPES.has(fuelType)) return validationError("Invalid fuelType");
  if (transmission != null && transmission !== "" && !TRANSMISSIONS.has(transmission)) return validationError("Invalid transmission");
  if (driveType != null && driveType !== "" && !DRIVE_TYPES.has(driveType)) return validationError("Invalid driveType");
  if (bodyType != null && bodyType !== "" && !BODY_TYPES.has(bodyType)) return validationError("Invalid bodyType");
  return null;
}

export async function createTrim({ generationId, name, engineCode, engineDisplacementCc, fuelType, transmission, driveType, bodyType }) {
  if (!generationId || !name?.trim()) return { error: validationError("generationId and name are required") };

  const generation = await db.vehicleGeneration.findUnique({ where: { id: generationId } });
  if (!generation) return { error: notFound("Generation not found") };

  const enumError = validateEnums({ fuelType, transmission, driveType, bodyType });
  if (enumError) return { error: enumError };

  const trim = await db.vehicleTrim.create({
    data: {
      generationId,
      name: name.trim(),
      engineCode: engineCode || null,
      engineDisplacementCc: engineDisplacementCc ? Number(engineDisplacementCc) : null,
      fuelType: fuelType || null,
      transmission: transmission || null,
      driveType: driveType || null,
      bodyType: bodyType || null,
    },
  });
  return { data: trim };
}

export async function updateTrim(id, body) {
  const before = await db.vehicleTrim.findUnique({ where: { id } });
  if (!before) return { error: notFound("Trim not found") };

  const { name, engineCode, engineDisplacementCc, fuelType, transmission, driveType, bodyType } = body;
  const enumError = validateEnums({ fuelType, transmission, driveType, bodyType });
  if (enumError) return { error: enumError };

  const trim = await db.vehicleTrim.update({
    where: { id },
    data: {
      ...(name !== undefined ? { name } : {}),
      ...(engineCode !== undefined ? { engineCode: engineCode || null } : {}),
      ...(engineDisplacementCc !== undefined
        ? { engineDisplacementCc: engineDisplacementCc ? Number(engineDisplacementCc) : null }
        : {}),
      ...(fuelType !== undefined ? { fuelType: fuelType || null } : {}),
      ...(transmission !== undefined ? { transmission: transmission || null } : {}),
      ...(driveType !== undefined ? { driveType: driveType || null } : {}),
      ...(bodyType !== undefined ? { bodyType: bodyType || null } : {}),
    },
  });
  return { data: trim, before };
}

export async function deleteTrim(id) {
  const before = await db.vehicleTrim.findUnique({ where: { id }, include: { _count: { select: { compatibility: true } } } });
  if (!before) return { error: notFound("Trim not found") };
  if (before._count.compatibility > 0) {
    return { error: conflict("This trim is linked to products — unlink them first") };
  }
  await db.vehicleTrim.delete({ where: { id } });
  return { data: before };
}