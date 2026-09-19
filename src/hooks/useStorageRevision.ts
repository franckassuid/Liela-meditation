"use client";
import { useEffect, useState } from "react";
export function useStorageRevision() {
  const [revision, setRevision] = useState(0);
  useEffect(() => {
    const change = () => setRevision((value) => value + 1);
    window.addEventListener("liela:storage-changed", change);
    return () => window.removeEventListener("liela:storage-changed", change);
  }, []);
  return revision;
}
