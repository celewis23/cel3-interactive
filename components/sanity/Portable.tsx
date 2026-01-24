"use client";

import { PortableText } from "@portabletext/react";

export function Portable({ value }: { value: any }) {
  return (
    <div className="prose prose-invert max-w-none prose-p:leading-relaxed prose-a:underline">
      <PortableText
        value={value}
        components={{
          block: {
            h2: ({ children }) => <h2 className="mt-10 text-2xl">{children}</h2>,
            h3: ({ children }) => <h3 className="mt-8 text-xl">{children}</h3>,
          },
          marks: {
            link: ({ children, value }) => {
              const href = value?.href as string | undefined;
              const isExternal = href?.startsWith("http");
              return (
                <a
                  href={href}
                  target={isExternal ? "_blank" : undefined}
                  rel={isExternal ? "noreferrer noopener" : undefined}
                >
                  {children}
                </a>
              );
            },
          },
        }}
      />
    </div>
  );
}
