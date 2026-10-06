type ImageSource = string | { _ref?: string; _id?: string; url?: string; asset?: { _ref?: string; _id?: string; url?: string } };

function imageUrl(source: ImageSource): string {
  if (typeof source === "string") {
    if (source.startsWith("image-")) return imageUrl({ _ref: source });
    if (source.startsWith("https://cdn.sanity.io/images/4kc4ksus/production/")) return `/media/migrated/${source.split("?")[0].split("/").at(-1)}`;
    return source;
  }
  const asset = source.asset ?? source;
  if (asset.url) return imageUrl(asset.url);
  const reference = asset._ref ?? asset._id ?? "";
  if (/^media\.[a-f0-9]{48}$/.test(reference)) return `/api/media/${reference}`;
  const match = /^image-([a-f0-9]+)-(\d+x\d+)-([a-z0-9]+)$/.exec(reference);
  return match ? `/media/migrated/${match[1]}-${match[2]}.${match[3]}` : "";
}

// Existing components size/crop images with CSS. Originals now ship with the site.
export function urlFor(source: ImageSource) {
  const result = {
    width: (value: number) => { void value; return result; },
    height: (value: number) => { void value; return result; },
    fit: (value: string) => { void value; return result; },
    url: () => imageUrl(source),
  };
  return result;
}

export const imageBuilder = { image: urlFor };
