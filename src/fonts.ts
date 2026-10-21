// Self-hosted fonts keep the scorebook export identical to the screen: html-to-image
// can read same-origin @font-face rules, which cross-origin Google Fonts CSS blocks.
// Import only the subsets the interface actually uses (Latin for Latin text, Bengali
// for Bangla) so the production build does not ship unused Cyrillic/Latin-ext files.
import '@fontsource/caveat/latin-500.css'
import '@fontsource/caveat/latin-600.css'
import '@fontsource/caveat/latin-700.css'
import '@fontsource/courier-prime/latin-400.css'
import '@fontsource/courier-prime/latin-700.css'
import '@fontsource/hind-siliguri/bengali-400.css'
import '@fontsource/hind-siliguri/bengali-500.css'
import '@fontsource/hind-siliguri/bengali-600.css'
import '@fontsource/hind-siliguri/bengali-700.css'
import '@fontsource/hind-siliguri/latin-400.css'
import '@fontsource/hind-siliguri/latin-500.css'
import '@fontsource/hind-siliguri/latin-600.css'
import '@fontsource/hind-siliguri/latin-700.css'
