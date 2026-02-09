export const GA_ID = "G-G1FLY7YQQB";

export const pageview = (url: string) => {
  if (typeof window === "undefined") return;
  // @ts-ignore
  window.gtag("config", GA_ID, {
    page_path: url,
  });
};
