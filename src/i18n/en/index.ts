import { ai } from './ai';
import { auditLog } from './audit-log';
import { auth } from './auth';
import { calendar } from './calendar';
import { common } from './common';
import { dates } from './dates';
import { devices } from './devices';
import { entry } from './entry';
import { errors } from './errors';
import { history } from './history';
import { intentions } from './intentions';
import { nav } from './nav';
import { offline } from './offline';
import { profile } from './profile';
import { push } from './push';
import { search } from './search';
import { sessions } from './sessions';
import { settings } from './settings';
import { stats } from './stats';
import { summary } from './summary';
import { tags } from './tags';

/**
 * English is the reference locale: `Dictionary` is derived from it, and every
 * other language's area file is typed against its English counterpart. That is
 * what keeps the languages in step — a key added here and forgotten there is a
 * type error, not a string that silently renders in the wrong language, and
 * `pnpm typecheck` is therefore the whole parity guarantee.
 */
export const en = {
  ai,
  auditLog,
  auth,
  calendar,
  common,
  dates,
  devices,
  entry,
  errors,
  history,
  intentions,
  nav,
  offline,
  profile,
  push,
  search,
  sessions,
  settings,
  stats,
  summary,
  tags,
};

export type Dictionary = typeof en;
