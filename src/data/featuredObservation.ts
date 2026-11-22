/** Edit this file to feature another observation. No other code changes required.
 *  The homepage specimen sheet is filled in from the iNaturalist observation at build time. */
import heroImage from '../assets/featured-orange-mushrooms.png';

export const featuredObservation = {
  id: 365930723,
  // The photo mounted on the specimen sheet, stored in src/assets/. It should be one of the observation's own photos.
  heroImage,
  heroAlt: 'Bright orange Gliophorus mushrooms among moss in a lawn',
  fieldNote: 'Found in a mossy patch of lawn between spruce trees.',
  question: 'What can a few mushrooms in a lawn tell us?',
  // Optional: how the locality reads on the label. Leave empty to use iNaturalist's place name.
  locality: '',
};
