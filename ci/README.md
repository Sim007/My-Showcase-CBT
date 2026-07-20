# ci/ — CI-agnostische gate-scripts

Alle gate- en testlogica leeft hier als losse bash-scripts, lokaal draaibaar zonder enige CI.
GitHub Actions-workflows (`.github/workflows/`) zijn dunne wrappers die deze scripts aanroepen —
geen logica in de yaml zelf. De GitLab CI/CD-component-templates in `templates/` zijn een
niet-draaiende referentie-implementatie die dezelfde scripts met dezelfde parametersignatuur
aanroept.

## Conventies

- **Parametersignatuur stabiel houden.** Elke wijziging aan een script se signatuur (contractnaam,
  pin, `--report-only`, …) moet 1-op-1 kunnen worden omgezet naar GitLab CI/CD-component-inputs.
- **Uniform output-formaat**, geïmplementeerd in `lib/gate-output.sh` en door elk script
  hergebruikt: kop (`gate | grens | contract@versie | modus`), voet (PASS/FAIL met bewijsmateriaal),
  slotregel `Dit bewijst: …`.
- Scripts zijn zelfstandig uitvoerbaar (`./ci/<script>.sh …`) en verwachten geen andere cwd dan de
  repo-root of `ci/` zelf.

## Status per script

| Script                | Status | Hoort bij onderdeel |
|------------------------|--------|----------------------|
| `diff-gate.sh`         | **Functioneel** — oasdiff (via `tufin/oasdiff` Docker-image) tegen versie-directories, OpenAPI only | 0 (nu al gebouwd, is demo-scenario 1) |
| `contract-verify.sh`   | Placeholder | 2-4 |
| `healthcheck.sh`       | Placeholder (parametersignatuur incl. `--report-only` staat al vast) | 6 |
| `smoke.sh`             | Placeholder | 7 |

## `diff-gate.sh`

```bash
ci/diff-gate.sh --contract order-payment [--report-only]
```

Vergelijkt de hoogste versie-directory onder `contracts/<naam>/` met de op-één-na-hoogste.
Ondersteunt op dit moment alleen OpenAPI-bestanden (via oasdiff); voor AsyncAPI- en
WSDL-contracten meldt het script expliciet dat er nog geen dekking is (geen silent pass) en geeft
exit 0. Faalt (exit 1) op een breaking change zonder major-bump, tenzij `--report-only` is
meegegeven.

Vereist Docker (voor het `tufin/oasdiff`-image) — geen lokale oasdiff-install nodig.
