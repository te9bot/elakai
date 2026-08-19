# Kushtia geography build

Regenerates `src/data/kushtia-geo.generated.ts` from OpenStreetMap.

Geometry is **© OpenStreetMap contributors**, [ODbL](https://www.openstreetmap.org/copyright).
The attribution string ships in the generated module and must stay rendered.

## Running it

Network access and Node 20+. Run in order, from this directory:

```
node overpass.mjs      # district + upazila boundaries, by admin level
node water-roads.mjs   # rivers and trunk/primary roads in the district window
node build.mjs         # project + simplify + merge paths
node emit.mjs          # write the TypeScript module
```

`fetch.mjs` is the earlier Nominatim free-text version, kept because it
documents why the Overpass query exists — see below. `check-sadar.mjs` is the
verification step and is the reason two boundaries are not shipped.

## Why the boundaries are not all here

The brief this was built for is explicit: do not invent boundaries. So the
module ships only geometry that was checked.

**Free-text search is not reliable for administrative data.** `fetch.mjs`
queried Nominatim by name and got a usable answer for four upazilas, nothing
at all for Kushtia Sadar, and a five-point *building* for "Mirpur" — almost
certainly Mirpur in Dhaka. Querying Overpass for `admin_level=6` relations
inside the district relation cannot make either mistake, which is what
`overpass.mjs` does.

**Two of the six upazila boundaries do not exist in usable form.** After the
Overpass query:

- Kushtia Sadar has no `admin_level=6` relation. A bbox sweep of the region
  returned 16 upazila relations and Sadar is not among them.
- The relation tagged `Mirpur` (`relation/17674651`) encloses the real Kushtia
  Sadar coordinate as well as Mirpur's own. `check-sadar.mjs` proves this by
  ray-casting each of the six real `AREA_MAP` coordinates against every
  fetched polygon: `Kushtia Sadar -> polygon=Mirpur`.

So four boundaries are trustworthy, one is wrong, and one is missing. Drawing
five polygons and captioning them as the six upazilas would be fiction, and
deriving Sadar as "district minus the other five" inherits the bad Mirpur
polygon. None are shipped.

The six upazilas are still on the map, as their real coordinates from
`src/data/categories.ts` — the same values the area filter and distance sort
use, so a marker and a distance can never disagree.

If better boundary data turns up — an HDX/Bangladesh government admin-4
dataset, or OSM once Sadar is mapped — `emit.mjs` is where it would be added.

## What ships

| Layer | Source | Notes |
| --- | --- | --- |
| District outline | OSM `relation/9517082`, `admin_level=5` | verified |
| Padma | `waterway=river`, named | the northern boundary |
| Tributaries | `waterway=river`, named | Gorai-Madhumati, Kumar Nod, Ichhamoti, Mathavanga |
| Trunk roads | `highway=trunk` | context, not navigation |
| Primary roads | `highway=primary` | context, not navigation |
| Upazila centres | `src/data/categories.ts` | real coordinates, not OSM |

## Size

12,476 source points reduce to 1,873 via Douglas-Peucker, and 252 OSM ways
concatenate into 4 path elements. About 22kb of path data. The projection is
equirectangular with a `cos(lat)` correction at the district's centre
latitude — without it the district is stretched about 9% horizontally, which
did not matter when the artwork was illustrative and does now.
