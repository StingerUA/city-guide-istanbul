# City Guide reference design

The traveler interface follows the HOME PAGE overview supplied on 22 October 2026. It contains exactly twelve categories in the supplied order, a weather card, exchange control, search, and five navigation actions. Listing cards show the venue name, district, photograph, and two actions: Reservation (or Work Time for venues without bookings) and How can I go?. Gallery, booking and branch-location flows retain their existing data and validation.

## Assets

- `public/images/city-guide-reference.jpg` is the unmodified overview supplied by the project owner. `components/reference-art.tsx` displays its individual category photographs and cloud background through SVG viewports.
- Twenty-four drawings in `public/category-icons/` were converted from the supplied reference screenshots into SVG paths. The remaining twenty SVG drawings cover the categories listed in the overview whose drawings were not visible in the screenshots.
- Navigation and weather illustrations are SVG components. Each instance uses its own gradient identifiers.
- `public/fonts/Italianno-Regular.ttf` is the Italianno typeface from the Google Fonts repository. Its SIL Open Font License is included alongside the font.

The pink, blue and dark-green palettes are stored as a local display preference. Live weather and exchange data retain their existing providers and error states; the reference's sample temperature is not used as live data. No database, authentication, payment or access-control changes are part of this update.
