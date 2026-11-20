import type { DbTx } from "@/lib/db";
import type { ServiceKind } from "@/modules/catalog/schema";
import type { FaqItem, MediaAsset, PortfolioItem, Testimonial } from "./schema";

export async function findPublishedPortfolioItems(
  tx: DbTx,
  filters?: { kind?: ServiceKind; occasionSlug?: string; featuredOnly?: boolean }
): Promise<PortfolioItem[]> {
  const clauses = ["pi.status = 'published'"];
  const params: unknown[] = [];

  if (filters?.kind) {
    params.push(filters.kind);
    clauses.push(`pi.kind = $${params.length}::service_kind`);
  }
  if (filters?.occasionSlug) {
    params.push(filters.occasionSlug);
    clauses.push(`o.slug = $${params.length}`);
  }
  if (filters?.featuredOnly) {
    clauses.push(`pi.is_featured = true`);
  }

  const res = await tx.query<
    PortfolioItem & {
      cover_id: string | null;
      cover_type: MediaAsset["type"] | null;
      cover_cloudinary_public_id: string | null;
      cover_poster_public_id: string | null;
      cover_width: number | null;
      cover_height: number | null;
      cover_alt_text: string | null;
      cover_video_provider: MediaAsset["video_provider"] | null;
      cover_video_id: string | null;
      cover_duration_seconds: number | null;
      cover_caption: string | null;
    }
  >(
    `select pi.id, pi.kind, pi.slug, pi.title, pi.summary, pi.occasion_id,
            o.slug as occasion_slug, o.name as occasion_name,
            pi.shot_on::text as shot_on, pi.location_text, pi.status, pi.is_featured, pi.sort_order,
            pi.client_consent_to_publish,
            pi.published_at::text as published_at, pi.created_at::text, pi.updated_at::text,
            (select count(*)::int from media_assets m where m.portfolio_item_id = pi.id) as media_count,
            cm.id as cover_id, cm.type as cover_type, cm.cloudinary_public_id as cover_cloudinary_public_id,
            cm.poster_public_id as cover_poster_public_id, cm.width as cover_width, cm.height as cover_height,
            cm.alt_text as cover_alt_text, cm.video_provider as cover_video_provider,
            cm.video_id as cover_video_id, cm.duration_seconds as cover_duration_seconds,
            cm.caption as cover_caption
       from portfolio_items pi
       left join occasions o on o.id = pi.occasion_id
       left join lateral (
         select id, type, cloudinary_public_id, poster_public_id, width, height, alt_text,
                video_provider, video_id, duration_seconds, caption
           from media_assets m
          where m.portfolio_item_id = pi.id
          order by m.is_cover desc, m.position asc, m.created_at asc
          limit 1
       ) cm on true
      where ${clauses.join(" and ")}
      order by pi.is_featured desc, pi.sort_order asc, pi.published_at desc`,
    params
  );

  return res.rows.map((row) => ({
    id: row.id,
    kind: row.kind,
    slug: row.slug,
    title: row.title,
    summary: row.summary,
    occasion_id: row.occasion_id,
    occasion_slug: row.occasion_slug,
    occasion_name: row.occasion_name,
    shot_on: row.shot_on,
    location_text: row.location_text,
    status: row.status,
    is_featured: row.is_featured,
    sort_order: row.sort_order,
    client_consent_to_publish: row.client_consent_to_publish,
    published_at: row.published_at,
    created_at: row.created_at,
    updated_at: row.updated_at,
    media_count: row.media_count ?? 0,
    cover_asset: row.cover_id
      ? {
          id: row.cover_id,
          portfolio_item_id: row.id,
          type: row.cover_type ?? "image",
          position: 0,
          is_cover: true,
          cloudinary_public_id: row.cover_cloudinary_public_id,
          poster_public_id: row.cover_poster_public_id,
          width: row.cover_width,
          height: row.cover_height,
          alt_text: row.cover_alt_text,
          video_provider: row.cover_video_provider,
          video_id: row.cover_video_id,
          duration_seconds: row.cover_duration_seconds,
          caption: row.cover_caption,
          created_at: row.created_at,
        }
      : null,
  }));
}

export async function findPortfolioItemBySlug(
  tx: DbTx,
  slug: string
): Promise<PortfolioItem | null> {
  const res = await tx.query<PortfolioItem>(
    `select pi.id, pi.kind, pi.slug, pi.title, pi.summary, pi.occasion_id,
            o.slug as occasion_slug, o.name as occasion_name,
            pi.shot_on::text as shot_on, pi.location_text, pi.status, pi.is_featured, pi.sort_order,
            pi.client_consent_to_publish,
            pi.published_at::text as published_at, pi.created_at::text, pi.updated_at::text
       from portfolio_items pi
       left join occasions o on o.id = pi.occasion_id
      where pi.slug = $1 and pi.status = 'published'`,
    [slug]
  );
  const item = res.rows[0];
  if (!item) return null;

  const mediaRes = await tx.query<MediaAsset>(
    `select id, portfolio_item_id, type, position, is_cover, cloudinary_public_id, poster_public_id,
            width, height, alt_text, video_provider, video_id, duration_seconds, caption, created_at::text
       from media_assets
      where portfolio_item_id = $1::uuid
      order by position asc, created_at asc`,
    [item.id]
  );

  return {
    ...item,
    media_count: mediaRes.rows.length,
    media_assets: mediaRes.rows,
    cover_asset: mediaRes.rows.find((m) => m.is_cover) ?? mediaRes.rows[0] ?? null,
  };
}

export async function findAllPortfolioAdmin(tx: DbTx): Promise<PortfolioItem[]> {
  const res = await tx.query<
    PortfolioItem & {
      cover_id: string | null;
      cover_type: MediaAsset["type"] | null;
      cover_cloudinary_public_id: string | null;
      cover_poster_public_id: string | null;
      cover_width: number | null;
      cover_height: number | null;
      cover_alt_text: string | null;
      cover_video_provider: MediaAsset["video_provider"] | null;
      cover_video_id: string | null;
      cover_duration_seconds: number | null;
      cover_caption: string | null;
    }
  >(
    `select pi.id, pi.kind, pi.slug, pi.title, pi.summary, pi.occasion_id,
            o.slug as occasion_slug, o.name as occasion_name,
            pi.shot_on::text as shot_on, pi.location_text, pi.status, pi.is_featured, pi.sort_order,
            pi.client_consent_to_publish, pi.consent_note,
            pi.published_at::text as published_at, pi.created_at::text, pi.updated_at::text,
            (select count(*)::int from media_assets m where m.portfolio_item_id = pi.id) as media_count,
            cm.id as cover_id, cm.type as cover_type, cm.cloudinary_public_id as cover_cloudinary_public_id,
            cm.poster_public_id as cover_poster_public_id, cm.width as cover_width, cm.height as cover_height,
            cm.alt_text as cover_alt_text, cm.video_provider as cover_video_provider,
            cm.video_id as cover_video_id, cm.duration_seconds as cover_duration_seconds,
            cm.caption as cover_caption
       from portfolio_items pi
       left join occasions o on o.id = pi.occasion_id
       left join lateral (
         select id, type, cloudinary_public_id, poster_public_id, width, height, alt_text,
                video_provider, video_id, duration_seconds, caption
           from media_assets m
          where m.portfolio_item_id = pi.id
          order by m.is_cover desc, m.position asc, m.created_at asc
          limit 1
       ) cm on true
      order by pi.updated_at desc, pi.sort_order asc`
  );
  return res.rows.map((row) => ({
    id: row.id,
    kind: row.kind,
    slug: row.slug,
    title: row.title,
    summary: row.summary,
    occasion_id: row.occasion_id,
    occasion_slug: row.occasion_slug,
    occasion_name: row.occasion_name,
    shot_on: row.shot_on,
    location_text: row.location_text,
    status: row.status,
    is_featured: row.is_featured,
    sort_order: row.sort_order,
    client_consent_to_publish: row.client_consent_to_publish,
    consent_note: row.consent_note,
    published_at: row.published_at,
    created_at: row.created_at,
    updated_at: row.updated_at,
    media_count: row.media_count ?? 0,
    cover_asset: row.cover_id
      ? {
          id: row.cover_id,
          portfolio_item_id: row.id,
          type: row.cover_type ?? "image",
          position: 0,
          is_cover: true,
          cloudinary_public_id: row.cover_cloudinary_public_id,
          poster_public_id: row.cover_poster_public_id,
          width: row.cover_width,
          height: row.cover_height,
          alt_text: row.cover_alt_text,
          video_provider: row.cover_video_provider,
          video_id: row.cover_video_id,
          duration_seconds: row.cover_duration_seconds,
          caption: row.cover_caption,
          created_at: row.created_at,
        }
      : null,
  }));
}

export async function findPortfolioAdminById(
  tx: DbTx,
  id: string
): Promise<PortfolioItem | null> {
  const res = await tx.query<PortfolioItem>(
    `select pi.id, pi.kind, pi.slug, pi.title, pi.summary, pi.occasion_id,
            o.slug as occasion_slug, o.name as occasion_name,
            pi.shot_on::text as shot_on, pi.location_text, pi.status, pi.is_featured, pi.sort_order,
            pi.client_consent_to_publish, pi.consent_note,
            pi.published_at::text as published_at, pi.created_at::text, pi.updated_at::text
       from portfolio_items pi
       left join occasions o on o.id = pi.occasion_id
      where pi.id = $1::uuid`,
    [id]
  );
  const item = res.rows[0];
  if (!item) return null;

  const mediaRes = await tx.query<MediaAsset>(
    `select id, portfolio_item_id, type, position, is_cover, cloudinary_public_id, poster_public_id,
            width, height, alt_text, video_provider, video_id, duration_seconds, caption, created_at::text
       from media_assets
      where portfolio_item_id = $1::uuid
      order by position asc, created_at asc`,
    [item.id]
  );

  return {
    ...item,
    media_count: mediaRes.rows.length,
    media_assets: mediaRes.rows,
    cover_asset: mediaRes.rows.find((m) => m.is_cover) ?? mediaRes.rows[0] ?? null,
  };
}

export async function findPublishedTestimonials(tx: DbTx): Promise<Testimonial[]> {
  const res = await tx.query<Testimonial>(
    `select id, author_name, author_context, quote, consent_to_publish, status, sort_order, created_at::text, updated_at::text
       from testimonials
      where status = 'published'
      order by sort_order asc, created_at desc`
  );
  return res.rows;
}

export async function findAllTestimonialsAdmin(tx: DbTx): Promise<Testimonial[]> {
  const res = await tx.query<Testimonial>(
    `select id, author_name, author_context, quote, booking_id, consent_to_publish, status, sort_order, created_at::text, updated_at::text
       from testimonials
      order by sort_order asc, created_at desc`
  );
  return res.rows;
}

export async function findPublishedFaqs(tx: DbTx): Promise<FaqItem[]> {
  const res = await tx.query<FaqItem>(
    `select id, question, answer, sort_order, is_published
       from faqs
      where is_published
      order by sort_order asc, question asc`
  );
  return res.rows;
}

export async function findAllFaqsAdmin(tx: DbTx): Promise<FaqItem[]> {
  const res = await tx.query<FaqItem>(
    `select id, question, answer, sort_order, is_published
       from faqs
      order by sort_order asc, question asc`
  );
  return res.rows;
}
