# CityAir — browser test report

Target : `https://sosa123454321-amqx-cityair.static.hf.space`
When   : 2026-10-08 10:12 UTC
Result : **33/33 checks passed**

| # | Check | Result | Detail |
| --- | --- | --- | --- |
| 1 | Home loads and mounts React | ✅ | h1 = 'Turn fragmented city evidence into accountable clean-air action' |
| 2 | Header navigation rendered | ✅ | 11 nav links |
| 3 | Hero image present | ✅ | public/images/hero-city.jpg |
| 4 | menu “logo” → Home | ✅ | hash=#/ h1='Turn fragmented city evidence into accountable clean' |
| 5 | menu “Guidance” → Guidance | ✅ | hash=#/guidance h1='Twelve domains of air-quality management capacity' |
| 6 | menu “Assess” → Assess | ✅ | hash=#/assess h1='Score your city across twelve domains' |
| 7 | menu “Results” → Results | ✅ | hash=#/results h1='No scored answers yet' |
| 8 | menu “Action plan” → Action plan | ✅ | hash=#/action-plan h1='A phased improvement plan generated from your gaps' |
| 9 | menu “Cities” → Cities | ✅ | hash=#/cities h1='Compare context, capacity and evidence confidence' |
| 10 | menu “Innovations” → Innovations | ✅ | hash=#/innovations h1='Innovations described honestly enough to assess' |
| 11 | menu “Matches” → Matches | ✅ | hash=#/innovation-match h1='Innovation matching against your recorded context' |
| 12 | menu “Resources” → Resources | ✅ | hash=#/resources h1='References you can check yourself' |
| 13 | menu “Method” → Method | ✅ | hash=#/methodology h1='How CityAir computes a readiness score — and where i' |
| 14 | menu “About” → About | ✅ | hash=#/about h1='About CityAir' |
| 15 | menu “Assistant” → Assistant | ✅ | hash=#/assistant h1='Ask questions grounded in the CityAir knowledge base' |
| 16 | Guidance accordion opens | ✅ | domain brief expanded |
| 17 | Innovation brief expands | ✅ | implementation brief expanded |
| 18 | City cards rendered | ✅ | 20 compare buttons |
| 19 | Compare 2 cities works | ✅ | grouped bar comparison shown |
| 20 | City detail page | ✅ | hash=#/cities/oslo h1='Oslo, Norway' |
| 21 | Live air-quality block on city page | ✅ | Open-Meteo reading section |
| 22 | Assessment wizard completes → results | ✅ | h1='Test City · Advanced stage' |
| 23 | Results dashboard shows gauge + confidence | ✅ | gauge, confidence dial and domain bars |
| 24 | Action plan generated from scores | ✅ | three phases rendered |
| 25 | Chat widget answers (RAG or retrieval) | ✅ | answer bubble with sources |
| 26 | Mobile: hamburger visible, desktop nav hidden | ✅ | responsive breakpoint behaves |
| 27 | Mobile: drawer menu opens with all links | ✅ | 12 links in drawer |
| 28 | Mobile: navigation works from the drawer | ✅ | hash=#/assess |
| 29 | Unknown route shows 404 card | ✅ | 404 view |
| 30 | Deep link /cities/bishkek resolves | ✅ | /cities/bishkek/index.html → hash=#/cities/bishkek h1='Bishkek, Kyrgyz Republic' |
| 31 | Deep link /guidance works | ✅ | /guidance/index.html → hash=#/guidance |
| 32 | Deep link /about works | ✅ | /about/index.html → hash=#/about |
| 33 | Deep link /methodology works | ✅ | /methodology/index.html → hash=#/methodology |

## Console / page errors

_No JavaScript errors, no failed resources during normal use._

### Expected during the run

6 × `404` — the deep-link checks deliberately request a bare path first (for example `/cities/bishkek`) before falling back to the per-route file `/cities/bishkek/index.html`. On hosts without SPA fallback (the Hugging Face static mirror) the first probe is a 404 by design; on Cloudflare the SPA fallback answers it.

## Screenshots

Saved in `docs/hf-test/screenshots`:

- `01-home.png`
- `02-guidance-open-brief.png`
- `03-cities-compare.png`
- `04-city-detail.png`
- `05-assess-step5.png`
- `06-results.png`
- `07-action-plan.png`
- `08-chat-widget.png`
- `09-mobile-menu.png`
- `10-mobile-assess.png`
- `menu-assistant.png`
- `menu-cities.png`
- `menu-guidance.png`
- `menu-innovations.png`
- `menu-method.png`
