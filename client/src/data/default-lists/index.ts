import type { DefaultListDef } from "@/types";

import lista1 from "./lista-1.json";
import lista2 from "./lista-2.json";
import lista3 from "./lista-3.json";
import lista4 from "./lista-4.json";
import lista5 from "./lista-5.json";

export type { DefaultListDef };

/** A bundled default list paired with the stable id used to track it against
 * the remote manifest (see services/default-lists) once it's seeded. */
export interface BundledDefaultList {
  id: string;
  def: DefaultListDef;
}

/**
 * Lists seeded on first launch so the app never starts empty — this is the
 * offline fallback; once online, services/default-lists can fetch fresher
 * content for these same ids (or entirely new ids) without a new deploy.
 * Ordered from zero knowledge to advanced.
 */
export const DEFAULT_LISTS: BundledDefaultList[] = [
  { id: "lista-5", def: lista5 },
  { id: "lista-1", def: lista1 },
  { id: "lista-2", def: lista2 },
  { id: "lista-3", def: lista3 },
  { id: "lista-4", def: lista4 },
];
