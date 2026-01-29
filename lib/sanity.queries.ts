export const workIndexQuery = /* groq */ `
  *[_type == "project"] | order(featured desc, _createdAt desc){
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
  *[_type == "project" && defined(slug.current)][]{
    "slug": slug.current
  }
`;

export const workBySlugQuery = /* groq */ `
  *[_type == "project" && slug.current == $slug][0]{
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
  coalesce(
    *[_type == "project" && featured == true] | order(_createdAt desc)[0...6]{
      _id,
      title,
      "slug": slug.current,
      summary,
      client,
      industry,
      heroImage
    },
    *[_type == "project"] | order(_createdAt desc)[0...6]{
      _id,
      title,
      "slug": slug.current,
      summary,
      client,
      industry,
      heroImage
    }
  )
`;


