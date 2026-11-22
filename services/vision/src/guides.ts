import { readFile } from "node:fs/promises";
import path from "node:path";

/** Source of founder setup guides. Swap for a published-guide lookup (founder admin) later. */
export interface GuideStore {
  /** Returns guide markdown, or undefined if unknown. `id` undefined means the default guide. */
  get(id?: string): Promise<string | undefined>;
}

export const GUIDE_ID = /^[a-z0-9][a-z0-9-]{0,63}$/;

/** Guides are `<dir>/<id>.md`. `defaultPath` (GUIDE_PATH) overrides the default guide file. */
export function fileGuideStore(dir: string, defaultId = "acme-sync", defaultPath?: string): GuideStore {
  return {
    async get(id) {
      let file: string;
      if (id === undefined) file = defaultPath ?? path.join(dir, `${defaultId}.md`);
      else if (GUIDE_ID.test(id)) file = path.join(dir, `${id}.md`);
      else return undefined; // never build a path from unvalidated input
      try {
        return await readFile(file, "utf8");
      } catch {
        return undefined;
      }
    },
  };
}
