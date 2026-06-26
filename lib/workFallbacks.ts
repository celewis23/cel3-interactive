export function getWorkHeroFallback(slug?: string) {
  if (slug === "griotos") return "/griotos.png";
  if (slug === "biobox") return "/bioboxscreen1.png";
  if (slug === "sacred-vibes-yoga") return "/work/sacred-vibes-yoga-card.jpg";
  if (slug === "magdalenas-metaphysical") return "/work/magdalenas-metaphysical-card.jpg";
  if (slug === "haus-of-anubis") return "/work/haus-of-anubis-card.jpg";
  if (slug === "blu-lotus-garden") return "/work/blu-lotus-garden-card.jpg";
  if (slug === "mr-1-dribble-pull-up") return "/work/mr-1-dribble-pull-up-card.jpg";
  if (slug === "forgeos") return "/work/forgeos-card.jpg";
  if (slug === "flowforge") return "/work/flowforge-card.jpg";
  if (slug === "archeionos") return "/work/archeionos-card.jpg";
  if (slug === "meterwise") return "/work/meterwise-card.jpg";
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

  const hero = getWorkHeroFallback(slug);
  return hero ? [hero] : [];
}
