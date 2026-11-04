# Homepage food photography

SmartKai retains the forest-green, sage and warm-cream theme. Photography is editorial context, not evidence of actual household outcomes or a change to tool availability.

## Sources and licence

The following source pages were checked on 31 October 2026 and identified the photographs as free to use under the [Unsplash License](https://unsplash.com/license), rather than the separate paid Unsplash+ licence. That licence permits downloading, adapting and distributing images, including commercial use. The implementation includes optional photographer credits on the homepage and a machine-readable registry in `public/media/food/credits.json`.

| Homepage use | Photographer | Source |
| --- | --- | --- |
| Hero and recommendations context | Collab Media | [Fresh vegetables together on a table](https://unsplash.com/photos/a-pile-of-vegetables-sitting-on-top-of-a-table-lzyaeNQ9wU4) |
| Organised pantry | Luisa Brimble | [Glass jars on wooden shelves](https://unsplash.com/photos/assorted-glass-jars-on-white-wooden-shelf-i-GPyFK_SJg) |
| Meal preparation | shraga kopstein | [Chopped vegetables on a cutting board](https://unsplash.com/photos/a-close-up-of-a-cutting-board-with-chopped-vegetables-EGtRM9PFG64) |
| Shopping and fresh produce | Nina Weishaupt | [Vegetables at a market](https://unsplash.com/photos/fresh-vegetables-and-produce-displayed-at-a-market-nwpPqHpFge4) |
| Prepared food / leftovers context | Ella Olsson | [Prepared meals in glass containers](https://unsplash.com/photos/meal-prep-containers-with-healthy-food-lMcRyBx4G50) |
| Food storage | Ello | [Containers and produce in a refrigerator](https://unsplash.com/photos/colorful-food-containers-in-refrigerator-AEU9UZstCfs) |

These photographs are illustrative, not SmartKai customer photographs or claims about New Zealand locations. Prepared-food photographs are not evidence that the meals were leftovers. Alt text describes what is visible. No photographer or product endorsement is implied.

## Assets and loading

Six photographs are stored locally as 640px, 1024px and 1600px WebP variants. The browser selects an appropriate version through `srcset` and `sizes`. The hero is eager/high-priority; the other six placements are lazy-loaded. All photographs have descriptive alt text, intrinsic dimensions and reserved CSS frame sizes to avoid layout movement.

`FoodPhoto` owns image loading and subtle scroll-linked scale/opacity. Its motion branch is disabled for reduced-motion users and environments without the homepage's animation support. Images remain visible in the static layout. Hero text stays on cream and the small overlaid caption uses a solid cream surface for contrast.

The desktop story pairs contextual photography in each supporting section with the pinned application preview. Smaller screens and reduced-motion layouts pair a large photograph with an overlapping application concept preview inline. Tools still under development retain their existing labels. No questionnaire, authentication or recommendation rules have moved into the homepage.

## Rebuilding the image variants

The checked-in files are sufficient for normal development and production builds. No image download is needed by visitors or by `npm run build`.

To regenerate the variants intentionally:

```powershell
node scripts/prepare-food-photos.js
```

The script fetches the six recorded source images and uses the development dependency Sharp to resize and encode WebP at quality 78. It records source URLs, dimensions and byte sizes in the credits registry. Do not substitute paid Unsplash+ photographs without the appropriate licence.

## Verification

Photography tests check seven accessible image placements, alt text, responsive sources, loading priorities, reserved dimensions, all 18 local assets and credits. Asset budgets are 120 KiB for 640px, 250 KiB for 1024px and 600 KiB for 1600px. The 1600px hero is about 134 KiB; its 1024px version is about 80 KiB.

Browser review covers desktop hero composition, the pantry photograph beside the pinned preview, mobile layout without horizontal overflow and a homepage without questionnaire inputs. Reduced-motion rendering and existing account/profile functionality remain covered by the regression suite. These checks are not a formal accessibility certification.
