"use client";
import { useSyncExternalStore } from "react";
import { getCatalogRevision, subscribeCatalog } from "@/lib/firebase/catalog";
export function useCatalogRevision() { return useSyncExternalStore(subscribeCatalog, getCatalogRevision, () => 0); }
