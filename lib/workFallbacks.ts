export function getWorkHeroFallback(slug?: string) {
  if (slug === "griotos") return "/griotos.png";
  if (slug === "biobox") return "/bioboxscreen1.png";
  return null;
}

export function getWorkGalleryFallback(slug?: string) {
  if (slug === "griotos") {
    return ["/griotos.png", "/griotosapp.png", "/griotosstudio.png"];
  }

  if (slug === "biobox") {
    return [
      "/bioboxscreen1.png",
      "/bioboxscreen2.png",
      "/bioboxscreen3.png",
      "/bioboxscreen4.png",
    ];
  }

  return [];
}
