// NEO Myco settings and the facts shown in "The basics" on /neo-myco/.
// Edit the text here; the page updates on the next build.

// Buttondown username for the launch-updates sign-up form
// (Buttondown → Settings → your username). Leave empty until the account exists:
// the form then shows that sign-up is not open yet instead of failing.
export const buttondownUsername = 'mycoview';

// Interests a person can tick on the sign-up form. Each one becomes a Buttondown tag.
export const interests: [tag: string, label: string][] = [
  ['forays', 'Forays'],
  ['workshops', 'Workshops'],
  ['microscopy', 'Microscopy'],
  ['dna-barcoding', 'DNA barcoding'],
  ['organizing', 'Helping organize'],
];

// "The basics". Use 'To be announced' for anything not settled yet.
export const basics: [label: string, value: string][] = [
  ['Organizer', 'Donn Bialik (MycoGeeky), founder. More organizers to be announced.'],
  ['Area', 'Northeast Ohio. Counties and parks to be announced.'],
  ['First events', '2027. Dates to be announced.'],
  ['How often', 'To be announced.'],
  ['Cost', 'To be announced.'],
  ['NAMA', 'We plan to affiliate with the North American Mycological Association (NAMA).'],
  ['Collecting', 'Only where collecting is permitted, following each site’s rules.'],
];
