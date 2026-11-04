"use client";

import { useEffect, useRef } from "react";

/** Keep email styles in their own document, away from the admin UI. */
export default function EmailBody({ html }: { html: string }) {
  const frameRef = useRef<HTMLIFrameElement>(null);

  useEffect(() => {
    const frame = frameRef.current;
    if (!frame) return;
    let observer: ResizeObserver | undefined;
    const measure = () => {
      const body = frame.contentDocument?.body;
      if (body) frame.style.height = `${Math.ceil(Math.max(body.scrollHeight, body.getBoundingClientRect().height))}px`;
    };
    const loaded = () => {
      observer?.disconnect();
      const body = frame.contentDocument?.body;
      if (!body) return;
      observer = new ResizeObserver(measure);
      observer.observe(body);
      measure();
    };
    frame.addEventListener("load", loaded);
    loaded();
    return () => {
      frame.removeEventListener("load", loaded);
      observer?.disconnect();
    };
  }, [html]);

  return (
    <iframe
      ref={frameRef}
      title="Email message body"
      className="block w-full border-0 bg-white"
      // Scripts remain disabled; same-origin access lets us measure the body
      // and lets inline images use the authenticated attachment endpoint.
      sandbox="allow-same-origin allow-popups allow-popups-to-escape-sandbox"
      referrerPolicy="no-referrer"
      srcDoc={`<!doctype html><html><head><meta charset="utf-8"><meta http-equiv="Content-Security-Policy" content="script-src 'none'; object-src 'none'; frame-src 'none'; form-action 'none'; base-uri 'none'"><base target="_blank"><style>html{background:white;color:#111827}body{margin:0;padding:16px 20px;display:flow-root;box-sizing:border-box;font:14px/1.5 Arial,sans-serif;overflow-wrap:break-word}img{max-width:100%;height:auto}</style></head><body>${html}</body></html>`}
    />
  );
}
