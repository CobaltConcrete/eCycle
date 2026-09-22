# Visual refinement — 22 September 2026

## Before implementation: the four learning questions

1. **Why was the previous solution insufficient?** The service selection screen had a direction, but global legacy selectors leaked between pages. Recovery buttons looked unstyled, checklist rows lacked a centered card layout, profile metadata looked like debug output, and map controls/popup content lacked a visual hierarchy.
2. **What does the change bring?** Shared forest, sage and warm-neutral colors, consistent rounded controls, a readable account summary, a centered accessible checklist, illustrated transport pills, grouped location panels and a styled marker popup. Responsive layouts preserve touch targets and visible keyboard focus.
3. **What could it lack?** A custom CSS system needs maintenance and browser checks. Google owns the surrounding map popup chrome; style our content without depending on its private class names. These changes do not improve route accuracy, database performance or prove full live authentication works.
4. **Alternatives:** Material UI could provide established controls but adds a dependency and requires broader markup changes. Tailwind would require tooling and class migration. Bootstrap's generic controls do not address the existing selector collisions. Incremental React/CSS components and local SVG icons fit this scope, avoid external icon/font requests and preserve current API behavior.

## Implementation and validation

Implemented:

- A shared `refinements.css` palette and control layer loaded after legacy styles, with page-scoped replacements for checklist and map CSS. Service selection retains its sage, blue-grey and warm-neutral cards. Discussion, report and shop forms inherit the shared palette; a complete conversion of all legacy selectors to CSS modules remains future work.
- Login/recovery/signup/profile actions share primary and secondary styling, generous spacing and visible focus. On mobile, the login form precedes the introductory story so users can reach it quickly.
- `AccountSummary` replaces the pipe-separated role/username/points line across checklist, service selection, forums, comments, reports and shop setup. Community points are labelled as such, not presented as environmental impact.
- Checklist is centered within a bounded-width card, with two columns on desktop and one on mobile. Visually hidden native checkboxes remain keyboard-focusable; selection has both a checkmark and color, plus a selection count.
- Four transport icons are local SVGs. Native radio controls allow keyboard arrow navigation; a moving pill highlights the selected mode, and reduced-motion preferences disable animation. Directions retain the existing mode values and cancellation behavior.
- Nearby/recent-place controls use labelled pressed-state buttons; the inactive list is hidden. Place cards and route instructions use consistent spacing and selection states.
- Marker popup contents use a heading, address, distance badge and grouped actions. Names/addresses still use `textContent`, external links still reject non-HTTP(S) URLs and use `noopener noreferrer`. No HTML interpolation was introduced. Google's surrounding popup frame is not overridden via private CSS selectors.

Validation actually performed:

- Seven frontend suites / **29 tests passed**. Existing route tests now exercise radio selection, including changing mode after selecting a historical location and rejecting stale route responses. Existing popup injection-safety test passes.
- Production build passed with existing unused-variable/Hook warnings in Comments/Forums and CRA/Browserslist/deprecation warnings. No new runtime package was installed.
- Chromium review of the production bundle at 1440px and 390px: login, checklist, service selection and map controls rendered; checklist and transport keyboard interactions and nearby/recent switching passed. Checklist, service selection and map had no horizontal overflow. Screenshots are local ignored artifacts (`artifacts/refined-*.png`). Final narrow-screen review is recorded below.
- Browser review intercepts Auth/API calls and substitutes a minimal Google SDK fixture; it does not create accounts, write database rows, call paid providers or verify the real Google map's chrome. No new backend test run was necessary because backend code is unchanged.

Remaining limitations: actual Google popup sizing, device geolocation and the deployed authenticated flow still require live browser verification; Safari and Firefox were not checked. Legacy discussion controls received shared styling but have not had a complete interaction/accessibility redesign. Render has not been deployed by this change.

Final review: after moving the mobile sign-in card ahead of the story and correcting shop-form width, the production build passed again. Chromium checks passed at **1440px, 390px and 320px**, including keyboard checkbox/radio behavior, switching place lists and no horizontal overflow on checklist/service/map pages. Reviewed desktop/mobile screenshots, including the settled transport-pill animation. `git diff --check` passed.
