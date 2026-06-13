import type { MetadataRoute } from "next";

const SITE_URL = "https://math.pandorika-it.com";

// The guest trainer is the public landing page (the root redirects to it), so it
// carries the top priority; login is a thin secondary entry.
export default function sitemap(): MetadataRoute.Sitemap {
  return [
    { url: `${SITE_URL}/guest`, changeFrequency: "monthly", priority: 1 },
    { url: `${SITE_URL}/login`, changeFrequency: "yearly", priority: 0.3 },
  ];
}
