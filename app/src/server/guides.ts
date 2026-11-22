// Founder-published setup guides (hackathon version: kept in server memory, no login).
// The inspect proxy sends a published guide's text to the vision service as `guideText`.
import { HttpError } from "wasp/server";
import type { GetPublishedGuide, ListPublishedGuides, PublishGuide } from "wasp/server/operations";

// A type alias (not an interface) so it satisfies Wasp's serializable Payload constraint.
export type PublishedGuide = {
  slug: string;
  productName: string;
  content: string;
  publishedAt: string;
};

const SLUG_RE = /^[a-z0-9][a-z0-9-]{0,63}$/;
const MAX_GUIDE_CHARS = 20_000;
const store = new Map<string, PublishedGuide>();

export function getStoredGuide(slug: string | undefined): PublishedGuide | undefined {
  return slug ? store.get(slug) : undefined;
}

export function slugify(name: string): string {
  return name
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 64);
}

export const publishGuide: PublishGuide<{ productName: string; slug?: string; content: string }, PublishedGuide> = async (
  args,
) => {
  const productName = String(args?.productName ?? "").trim();
  const content = String(args?.content ?? "").trim();
  const slug = (args?.slug ? String(args.slug) : slugify(productName)).trim().toLowerCase();
  if (!productName || productName.length > 80) throw new HttpError(400, "Enter a product name (up to 80 characters).");
  if (!SLUG_RE.test(slug)) throw new HttpError(400, "The link name can use lowercase letters, numbers and dashes.");
  if (content.length < 20) throw new HttpError(400, "Paste or upload your setup guide first.");
  if (content.length > MAX_GUIDE_CHARS) throw new HttpError(400, "That guide is too long (20,000 characters max).");
  const guide = { slug, productName, content, publishedAt: new Date().toISOString() };
  store.set(slug, guide);
  console.log(`[guides] published slug=${slug} chars=${content.length}`);
  return guide;
};

export const getPublishedGuide: GetPublishedGuide<{ slug: string }, { slug: string; productName: string } | null> = async (
  args,
) => {
  const g = store.get(String(args?.slug ?? ""));
  return g ? { slug: g.slug, productName: g.productName } : null;
};

export const listPublishedGuides: ListPublishedGuides<void, { slug: string; productName: string; publishedAt: string }[]> =
  async () => [...store.values()].map(({ slug, productName, publishedAt }) => ({ slug, productName, publishedAt }));
