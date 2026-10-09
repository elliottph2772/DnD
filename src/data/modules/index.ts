// The module registry. Campaigns reference a module by id.
//
// Modules ship with the app for now. A zip importer — Elliott's delivery
// format — writes third-party modules into the same shape at campaign
// creation; nothing downstream needs to know which route a module arrived by.

import { ASHFALL } from './ashfall';
import type { CampaignModule, Ref } from './types';

export const MODULES: readonly CampaignModule[] = [ASHFALL];

export const moduleById = (id: Ref): CampaignModule | null =>
  MODULES.find((m) => m.id === id) ?? null;

export * from './types';
export { ASHFALL };
