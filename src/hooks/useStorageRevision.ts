"use client";
import { useEffect, useState } from "react";

export function useStorageRevision(keys?: readonly string[]) {
  const [revision, setRevision] = useState(0);
  const keySignature = keys?.join("|") ?? "";

  useEffect(() => {
    const acceptedKeys = keySignature ? new Set(keySignature.split("|")) : null;
    const change = (event: Event) => {
      const changedKey = (event as CustomEvent<string | undefined>).detail;
      if (acceptedKeys && changedKey && !acceptedKeys.has(changedKey)) return;
      setRevision((value) => value + 1);
    };
    window.addEventListener("liela:storage-changed", change);
    return () => window.removeEventListener("liela:storage-changed", change);
  }, [keySignature]);

  return revision;
}
