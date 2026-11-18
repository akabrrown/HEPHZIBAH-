import { revalidatePath } from "next/cache";
import type { AdminSessionPayload } from "@/lib/auth";
import { getCached, invalidateCache, setCached } from "@/lib/cache";
import { withAdminRole, withAnonRole } from "@/lib/db";
import { ProblemError } from "@/lib/errors";
import {
  findActiveOccasions,
  findActivePackages,
  findActiveServices,
  findAllPackagesAdmin,
  findAllServicesAdmin,
  findSiteSettings,
} from "./repository";
import {
  packageUpsertSchema,
  serviceUpsertSchema,
  siteSettingsPatchSchema,
  type Occasion,
  type PackageItem,
  type Service,
  type ServiceKind,
  type SiteSettings,
} from "./schema";

export async function getPublicSiteSettings(): Promise<SiteSettings> {
  const cacheKey = "catalog:site_settings";
  const cached = getCached<SiteSettings>(cacheKey);
  if (cached) return cached;

  const result = await withAnonRole((tx) => findSiteSettings(tx));
  setCached(cacheKey, result, 300);
  return result;
}

export async function getPublicCatalogue(kind?: ServiceKind): Promise<{
  occasions: Occasion[];
  services: Service[];
  packages: PackageItem[];
}> {
  const cacheKey = `catalog:public:${kind ?? "all"}`;
  const cached = getCached<{
    occasions: Occasion[];
    services: Service[];
    packages: PackageItem[];
  }>(cacheKey);
  if (cached) return cached;

  const result = await withAnonRole(async (tx) => {
    const [occasions, services, packages] = await Promise.all([
      findActiveOccasions(tx, kind),
      findActiveServices(tx, kind),
      findActivePackages(tx, kind ? { kind } : undefined),
    ]);
    return { occasions, services, packages };
  });

  setCached(cacheKey, result, 300);
  return result;
}

export async function listAdminServicesAndPackages(admin: AdminSessionPayload): Promise<{
  services: Service[];
  packages: PackageItem[];
}> {
  return withAdminRole(admin.adminId, admin.aal, async (tx) => {
    const [services, packages] = await Promise.all([
      findAllServicesAdmin(tx),
      findAllPackagesAdmin(tx),
    ]);
    return { services, packages };
  });
}

export async function upsertAdminService(
  admin: AdminSessionPayload,
  rawInput: unknown
): Promise<Service> {
  const parsed = serviceUpsertSchema.safeParse(rawInput);
  if (!parsed.success) {
    throw new ProblemError(422, "validation_error", "Check service fields", "Invalid service input.", {
      fieldErrors: parsed.error.flatten().fieldErrors as Record<string, string[]>,
    });
  }
  const v = parsed.data;
  const saved = await withAdminRole(admin.adminId, admin.aal, async (tx) => {
    if (v.id) {
      const res = await tx.query<Service>(
        `update services
            set kind = $2::service_kind,
                slug = $3,
                name = $4,
                summary = $5,
                description_md = $6,
                starting_price_minor = $7,
                sort_order = $8,
                is_active = $9
          where id = $1::uuid
          returning id, kind, slug, name, summary, description_md, starting_price_minor, currency, sort_order, is_active, created_at::text, updated_at::text`,
        [
          v.id,
          v.kind,
          v.slug,
          v.name,
          v.summary,
          v.description_md ?? null,
          v.starting_price_minor ?? null,
          v.sort_order,
          v.is_active,
        ]
      );
      if (!res.rows[0]) {
        throw new ProblemError(404, "not_found", "Service not found", "No service matches that ID.");
      }
      return res.rows[0];
    }

    const res = await tx.query<Service>(
      `insert into services (kind, slug, name, summary, description_md, starting_price_minor, sort_order, is_active)
       values ($1::service_kind, $2, $3, $4, $5, $6, $7, $8)
       returning id, kind, slug, name, summary, description_md, starting_price_minor, currency, sort_order, is_active, created_at::text, updated_at::text`,
      [
        v.kind,
        v.slug,
        v.name,
        v.summary,
        v.description_md ?? null,
        v.starting_price_minor ?? null,
        v.sort_order,
        v.is_active,
      ]
    );
    return res.rows[0]!;
  });

  invalidateCache("catalog");
  try {
    revalidatePath("/");
    revalidatePath("/services");
    revalidatePath(`/services/${saved.kind}`);
    revalidatePath("/pricing");
    revalidatePath("/book");
  } catch {
    // Non-Next test contexts ignore cache revalidation
  }

  return saved;
}

export async function upsertAdminPackage(
  admin: AdminSessionPayload,
  rawInput: unknown
): Promise<PackageItem> {
  const parsed = packageUpsertSchema.safeParse(rawInput);
  if (!parsed.success) {
    throw new ProblemError(422, "validation_error", "Check package fields", "Invalid package input.", {
      fieldErrors: parsed.error.flatten().fieldErrors as Record<string, string[]>,
    });
  }
  const v = parsed.data;
  const saved = await withAdminRole(admin.adminId, admin.aal, async (tx) => {
    if (v.id) {
      const res = await tx.query<PackageItem>(
        `update packages
            set service_id = $2::uuid,
                name = $3,
                summary = $4,
                price_minor = $5,
                duration_hours = $6,
                deliverables = $7,
                is_featured = $8,
                sort_order = $9,
                is_active = $10
          where id = $1::uuid
          returning id, service_id, name, summary, price_minor, currency, duration_hours::float8 as duration_hours,
                    deliverables, is_featured, sort_order, is_active, created_at::text, updated_at::text`,
        [
          v.id,
          v.service_id,
          v.name,
          v.summary ?? null,
          v.price_minor,
          v.duration_hours ?? null,
          v.deliverables,
          v.is_featured,
          v.sort_order,
          v.is_active,
        ]
      );
      if (!res.rows[0]) {
        throw new ProblemError(404, "not_found", "Package not found", "No package matches that ID.");
      }
      return res.rows[0];
    }

    const res = await tx.query<PackageItem>(
      `insert into packages (service_id, name, summary, price_minor, duration_hours, deliverables, is_featured, sort_order, is_active)
       values ($1::uuid, $2, $3, $4, $5, $6, $7, $8, $9)
       returning id, service_id, name, summary, price_minor, currency, duration_hours::float8 as duration_hours,
                 deliverables, is_featured, sort_order, is_active, created_at::text, updated_at::text`,
      [
        v.service_id,
        v.name,
        v.summary ?? null,
        v.price_minor,
        v.duration_hours ?? null,
        v.deliverables,
        v.is_featured,
        v.sort_order,
        v.is_active,
      ]
    );
    return res.rows[0]!;
  });

  invalidateCache("catalog");
  try {
    revalidatePath("/pricing");
    revalidatePath("/services");
    revalidatePath("/services/photography");
    revalidatePath("/services/videography");
    revalidatePath("/services/design");
    revalidatePath("/book");
  } catch {
    // ignore outside request lifecycle
  }

  return saved;
}

export async function deleteAdminService(
  admin: AdminSessionPayload,
  id: string
): Promise<void> {
  await withAdminRole(admin.adminId, admin.aal, async (tx) => {
    // Delete associated packages first to satisfy foreign key constraint
    await tx.query(`delete from packages where service_id = $1::uuid`, [id]);
    const res = await tx.query(`delete from services where id = $1::uuid returning id`, [id]);
    if (!res.rows[0]) {
      throw new ProblemError(404, "not_found", "Service not found", "No service matches that ID.");
    }
  });

  invalidateCache("catalog");
  try {
    revalidatePath("/");
    revalidatePath("/services");
    revalidatePath("/pricing");
    revalidatePath("/book");
  } catch {
    // ignore outside request lifecycle
  }
}

export async function deleteAdminPackage(
  admin: AdminSessionPayload,
  id: string
): Promise<void> {
  await withAdminRole(admin.adminId, admin.aal, async (tx) => {
    const res = await tx.query(`delete from packages where id = $1::uuid returning id`, [id]);
    if (!res.rows[0]) {
      throw new ProblemError(404, "not_found", "Package not found", "No package matches that ID.");
    }
  });

  invalidateCache("catalog");
  try {
    revalidatePath("/pricing");
    revalidatePath("/services");
    revalidatePath("/book");
  } catch {
    // ignore outside request lifecycle
  }
}

export async function updateAdminSiteSettings(
  admin: AdminSessionPayload,
  rawInput: unknown
): Promise<SiteSettings> {
  const parsed = siteSettingsPatchSchema.safeParse(rawInput);
  if (!parsed.success) {
    throw new ProblemError(422, "validation_error", "Check settings fields", "Invalid settings input.", {
      fieldErrors: parsed.error.flatten().fieldErrors as Record<string, string[]>,
    });
  }
  const v = parsed.data;
  const updated = await withAdminRole(admin.adminId, admin.aal, async (tx) => {
    const res = await tx.query<SiteSettings>(
      `update site_settings
          set business_name = $1,
              contact_email = $2::citext,
              whatsapp_e164 = $3,
              phone_e164 = $4,
              address_text = $5,
              social = $6::jsonb,
              min_lead_days = $7,
              max_advance_days = $8,
              quote_validity_days = $9,
              budget_bands = $10::jsonb
        where id = 1
        returning id, business_name, contact_email::text as contact_email, whatsapp_e164, phone_e164,
                  address_text, social, min_lead_days, max_advance_days, quote_validity_days,
                  budget_bands, updated_at::text`,
      [
        v.business_name,
        v.contact_email,
        v.whatsapp_e164,
        v.phone_e164 ?? null,
        v.address_text ?? null,
        JSON.stringify(v.social),
        v.min_lead_days,
        v.max_advance_days,
        v.quote_validity_days,
        JSON.stringify(v.budget_bands),
      ]
    );
    return res.rows[0]!;
  });

  invalidateCache("catalog");
  try {
    revalidatePath("/", "layout");
  } catch {
    // ignore outside request lifecycle
  }

  return updated;
}
