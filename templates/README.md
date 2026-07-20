# templates/ — GitLab CI/CD-componenten (referentie, draait niet)

Deze map bevat GitLab CI/CD-component-templates volgens de GitLab-conventie
(`templates/<component>/template.yml` met een `spec: inputs:`-blok). Ze zijn een
**niet-draaiende referentie-implementatie**: deze repo is GitHub-gehost, en de
draaiende CI-laag is `.github/workflows/`.

Elke component roept exact hetzelfde `ci/*.sh`-script aan als de bijbehorende GitHub
Actions-stap, met inputs die 1-op-1 de parametersignatuur van dat script volgen. Wijzig je
een script z'n signatuur, werk dan ook de bijbehorende `spec: inputs:` hier bij.

| Component            | Roept aan               | Status                        |
|-----------------------|--------------------------|--------------------------------|
| `diff-gate/`          | `ci/diff-gate.sh`        | Component + script functioneel |
| `contract-verify/`    | `ci/contract-verify.sh`  | Component klaar, script is placeholder (onderdeel 2-4) |
| `healthcheck/`        | `ci/healthcheck.sh`      | Component klaar, script is placeholder (onderdeel 6) |
| `smoke/`               | `ci/smoke.sh`            | Component klaar, script is placeholder (onderdeel 7) |

`.gitlab-ci.yml.example` in deze map toont hoe de componenten met inputs geconsumeerd worden.
Bewust **niet** in de repo-root gezet en met een `.example`-extensie: een echte
`.gitlab-ci.yml` op root-niveau zou bij een eventuele GitLab-mirror automatisch oppikken en
naast de draaiende `.github/workflows/`-laag een tweede CI laten draaien — precies de
dubbele-onderhoudslast die deze architectuur vermijdt.
