# Maxxwell Logistics — corporate website

Static site, no build step: `index.html` (home), `services.html` (full service details), `css/styles.css`, `js/main.js`, `js/config.js`. Both pages share the same header and footer markup, so edit nav or footer links in both.

## Run locally

```bash
python -m http.server 5500
```

Then open http://localhost:5500. Any static host (Netlify, Vercel, S3, nginx) works.

## Connecting the backend (`js/config.js`)

| Setting | What it does | If left empty |
| --- | --- | --- |
| `formEndpoint` | The contact form POSTs JSON here (Formspree, Basin, your own API) | Opens the visitor's email client, pre-filled and addressed to `contactEmail` |
| `contactEmail` | Address used by the email fallback | — |


## Notes
- Map land data loads at runtime from `world-atlas` and `topojson-client` on jsDelivr. If it can't load, the map falls back to a plain grid.
- Photos are hotlinked from Unsplash. Replace them with your own licensed photography before launch.
- Contact details (Coimbatore office, phone, email, branches) are real. Statistics, accreditations and the network-map hubs are still placeholder copy.
