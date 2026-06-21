"use client";

import { useEffect } from "react";

export function PointerEventPatch() {
  useEffect(() => {
    if (typeof window !== "undefined") {
      const originalReleasePointerCapture = Element.prototype.releasePointerCapture;
      Element.prototype.releasePointerCapture = function (pointerId) {
        try {
          originalReleasePointerCapture.call(this, pointerId);
        } catch (e: any) {
          if (e.name === "NotFoundError") {
            // Ignore the NotFoundError to prevent Next.js error overlay
            // This is a known Chrome DevTools bug with vaul/radix drawers in mobile emulation
          } else {
            throw e;
          }
        }
      };
    }
  }, []);

  return null;
}
