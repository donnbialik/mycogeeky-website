/** Builds the homepage specimen sheet from the featured iNaturalist observation (fetched at build time).
 *  If iNaturalist can't be reached during a build, the last known values below are used so the page still builds. */
import { featuredObservation as feature } from './featuredObservation';

const OWN_LOGINS: Record<string, string> = { mycogeekyohio: 'MycoGeeky' };

// Values copied from observation 365930723 on 22 Nov 2026. Update them if you feature another observation.
const LAST_KNOWN: any = {
  id: 365930723,
  name: "Gliophorus sp. 'psittacinus-IN04'",
  provisional: true,
  observed: '27 May 2026',
  locality: 'Ranchwood Rd, Ghent, Ohio',
  habitat: feature.fieldNote,
  collector: 'MycoGeeky',
  its: { length: 649, tech: 'Nanopore', reads: '88', plate: '2026 #4' },
  question: feature.question,
  questionUrl: '/one-place/',
};

const field = (o: any, re: RegExp) => o?.ofvs?.find((f: any) => re.test(f.name))?.value as string | undefined;
const tidyPlace = (p: string) => p.replace(/,\s*US$/, '').replace(/,\s*OH$/, ', Ohio');

export async function loadFeaturedSheet(): Promise<{ data: any; live: boolean }> {
  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 6000);
    const res = await fetch(`https://api.inaturalist.org/v1/observations/${feature.id}`, { headers: { Accept: 'application/json' }, signal: controller.signal });
    clearTimeout(timer);
    if (!res.ok) throw new Error(String(res.status));
    const o = (await res.json()).results?.find((r: any) => r.id === feature.id);
    if (!o) throw new Error('missing');
    const provisionalName = field(o, /^provisional species name$/i);
    const name: string = provisionalName || o.taxon?.name || 'Unidentified';
    const seq = (field(o, /dna barcode its/i) || '').replace(/[^ACGTNRYKMSWBDHV]/gi, '');
    const tech = field(o, /sequencing technology/i)?.replace(/\s*\(.*\)$/, '');
    const reads = field(o, /reads in consensus/i);
    const plate = field(o, /mycota lab plate/i);
    const observed = o.observed_on ? new Date(o.observed_on + 'T12:00:00Z').toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC' }) : '';
    return {
      live: true,
      data: {
        id: feature.id,
        name,
        provisional: !!provisionalName || /['‘’]/.test(name),
        observed,
        locality: feature.locality || tidyPlace(o.place_guess || ''),
        habitat: feature.fieldNote,
        collector: OWN_LOGINS[o.user?.login] || `@${o.user?.login}`,
        its: seq.length ? { length: seq.length, tech, reads, plate } : null,
        question: feature.question,
        questionUrl: '/one-place/',
      },
    };
  } catch {
    // Never put one observation's details on another: if the featured observation changed, the build needs iNaturalist.
    if (feature.id !== LAST_KNOWN.id) throw new Error(`Could not reach iNaturalist to build the specimen sheet for observation ${feature.id}. Try the build again, or update LAST_KNOWN in src/data/featuredSheet.ts.`);
    return { live: false, data: LAST_KNOWN };
  }
}
