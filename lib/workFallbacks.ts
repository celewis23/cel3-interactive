export function getWorkHeroFallback(slug?: string) {
  if (slug === "griotos") return "/griotos.png";
  return null;
}

export function getWorkGalleryFallback(slug?: string) {
  if (slug === "griotos") {
    return ["/griotos.png", "/griotosapp.png", "/griotosstudio.png"];
  }

  return [];
}
