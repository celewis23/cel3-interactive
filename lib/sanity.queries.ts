export const workIndexQuery = /* groq */ `
  *[_type == "project" && !(_id in path("drafts.**"))] | order(featured desc, _createdAt desc){
    _id,
    title,
    "slug": slug.current,
    summary,
    featured,
    client,
    industry,
    heroImage
  }
`;

export const workSlugsQuery = /* groq */ `
  *[_type == "project" && defined(slug.current) && !(_id in path("drafts.**"))][]{
    "slug": slug.current
  }
`;

export const workBySlugQuery = /* groq */ `
  *[_type == "project" && slug.current == $slug && !(_id in path("drafts.**"))][0]{
    _id,
    title,
    "slug": slug.current,
    summary,
    featured,
    client,
    industry,
    timeline,
    stack,
    results,
    heroImage,
    gallery,
    body,
    services[]->{
      _id,
      title,
      "slug": slug.current
    }
  }
`;

export const featuredWorkQuery = /* groq */ `
  *[_type == "project" && featured == true && !(_id in path("drafts.**"))] | order(_createdAt desc)[0...6]{
    _id,
    title,
    "slug": slug.current,
    summary,
    client,
    industry,
    heroImage
  }
`;

export const allWorkQuery = `
  *[_type == "project" && !(_id in path("drafts.**"))] | order(featured desc, _createdAt desc) {
    _id,
    title,
    "slug": slug.current,
    summary,
    client,
    industry,
    featured,
    heroImage
  }
`;



