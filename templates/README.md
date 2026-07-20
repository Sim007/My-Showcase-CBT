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

Het root-`.gitlab-ci.yml` toont hoe deze componenten met inputs geconsumeerd worden — ook
dat bestand draait niet in deze repo, het is illustratief.
