# CityAir — browser test report

Target : `http://127.0.0.1:8788`
When   : 2026-10-08 12:07 UTC
Result : **68/68 checks passed**

| # | Check | Result | Detail |
| --- | --- | --- | --- |
| 1 | Home loads and mounts React | ✅ | h1 = 'Turn fragmented city evidence into accountable clean-air action' |
| 2 | Header navigation rendered | ✅ | 13 nav links |
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
| 27 | Mobile: drawer menu opens with all links | ✅ | 14 links in drawer |
| 28 | Mobile: navigation works from the drawer | ✅ | hash=#/assess |
| 29 | Expo page loads | ✅ | h1='ISAF Smartex 2026 — cooperation brief for smart-city and air-quality c' |
| 30 | Expo: live status badge + event facts | ✅ | status badge and venue rendered |
| 31 | Expo: cooperation models rendered | ✅ | 6 articles on page |
| 32 | Expo: company table rendered | ✅ | 41 table rows |
| 33 | Expo: search filters the table | ✅ | 21 rows after searching 'sensor' |
| 34 | Expo: priority filter works | ✅ | 24 priority-A rows |
| 35 | Expo: row detail expands | ✅ | full brief visible |
| 36 | Expo: outreach kit + org strip present | ✅ | templates, checklist and organisation chips |
| 37 | Expo: copy-to-clipboard works | ✅ | copy button responded |
| 38 | Expo: header link and route reachable from the menu | ✅ | EXPO 2026 in the navigation |
| 39 | Partners page loads | ✅ | h1='Partnerships, outreach & archive' |
| 40 | Partners: timeline renders with the Dialogue and COP31 entries | ✅ | chronology section rendered |
| 41 | Partners: contact register rendered | ✅ | 8 contact cards |
| 42 | Partners: status chips and verification flags | ✅ | verification warning and priority chips present |
| 43 | Partners: archive letters rendered | ✅ | 5 archive entries |
| 44 | Partners: archive search filters | ✅ | 3 of 5 entries after searching 'MoveGreen' |
| 45 | Partners: direction filter works | ✅ | 2 outgoing entries |
| 46 | Partners: outgoing letter text present | ✅ | full outgoing message rendered verbatim |
| 47 | Partners: archive-coverage panel shows a percentage | ✅ | coverage section rendered with percent |
| 48 | Partners: per-document coverage bars | ✅ | 6 progress bars |
| 49 | Partners: gap register table rendered | ✅ | 10 registered gaps |
| 50 | Partners: coverage chips on each archive record | ✅ | per-record coverage chips present |
| 51 | Partners: concept note record is linked | ✅ | concept note PDF link present |
| 52 | Partners: letter copy-to-clipboard works | ✅ | copy button responded |
| 53 | Partners: privacy + org strip present | ✅ | privacy list and organisation links |
| 54 | Partners: header link reachable from the menu | ✅ | Partners in the navigation |
| 55 | Admin: login screen loads and is marked noindex | ✅ | login card + robots meta |
| 56 | Admin: wrong password is refused in the UI | ✅ | error message shown, no data loaded |
| 57 | Admin: private database is not in the page source | ✅ | no private letter text before login |
| 58 | Admin: correct credentials open the panel | ✅ | dashboard rendered |
| 59 | Admin: full private letters are readable after login | ✅ | 4 letters with copy buttons |
| 60 | Admin: contacts show the private-only fields | ✅ | private blocks + unverified flag |
| 61 | Admin: important notes tab renders | ✅ | notes visible |
| 62 | Admin: logout returns to the login screen | ✅ | session ended client-side |
| 63 | Unknown route shows 404 card | ✅ | 404 view |
| 64 | Deep link /cities/bishkek resolves | ✅ | /cities/bishkek → hash=#/cities/bishkek h1='Bishkek, Kyrgyz Republic' |
| 65 | Deep link /guidance works | ✅ | /guidance → hash=#/guidance |
| 66 | Deep link /about works | ✅ | /about → hash=#/about |
| 67 | Deep link /methodology works | ✅ | /methodology → hash=#/methodology |
| 68 | Deep link /partners works | ✅ | /partners → hash=#/partners |

## Console / page errors

_No JavaScript errors, no failed resources during normal use._

## Screenshots

Saved in `docs/screenshots`:

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
- `11-home-scrolled.png`
- `12-home-stages.png`
- `13-hf-deeplink-bishkek.png`
- `14-expo-table.png`
- `15-expo-full.png`
- `16-partners-archive.png`
- `17-partners-full.png`
- `18-partners-live-hf.png`
- `19-partners-coverage-live.png`
- `20-admin-login.png`
- `21-admin-letters.png`
- `22-admin-contacts-private.png`
- `23-admin-tasks.png`
- `24-admin-log.png`
- `25-admin-login-screen.png`
- `menu-assistant.png`
- `menu-cities.png`
- `menu-guidance.png`
- `menu-innovations.png`
- `menu-method.png`
