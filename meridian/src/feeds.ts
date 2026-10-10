import { GDACS_FEED, parseGdacs } from './parsers/gdacs.ts';
import { gdeltUrl, parseGdelt } from './parsers/gdelt.ts';
import { parseReliefweb, reliefwebUrl } from './parsers/reliefweb.ts';
import { parseUnhcr, unhcrUrl } from './parsers/unhcr.ts';
import { USGS_FEED, parseUsgs } from './parsers/usgs.ts';

const MIN = 60_000;

export const feeds = {
  usgs: { url: USGS_FEED, parse: parseUsgs, refreshMs: 5 * MIN },
  gdacs: { url: GDACS_FEED, parse: parseGdacs, refreshMs: 10 * MIN },
  gdelt: { url: gdeltUrl(), parse: parseGdelt, refreshMs: 5 * MIN },
  // UNHCR publishes year-end stocks with a lag; two years back is the safe default.
  unhcr: { url: unhcrUrl(new Date().getUTCFullYear() - 2), parse: parseUnhcr, refreshMs: 24 * 60 * MIN },
  reliefweb: (appname: string | undefined) => ({
    url: appname ? reliefwebUrl(appname) : undefined,
    parse: parseReliefweb,
    refreshMs: 10 * MIN,
  }),
};
