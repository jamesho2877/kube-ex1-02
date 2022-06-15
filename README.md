# Project vX.Y

This project includes solutions for the following exercises:

* Exercise 1.02: Project v0.1
* Exercise 1.04: Project v0.2
* Exercise 1.05: Project v0.3
* Exercise 1.06: Project v0.4
* Exercise 1.08: Project v0.5
* Exercise 1.09: More services
* Exercise 1.12: Project v0.6
* Exercise 1.13: Project v0.7
* Exercise 2.02: Project v1.0
* Exercise 2.04: Project v1.1
* Exercise 2.08: Project v1.2
* Exercise 2.09: Daily todos
* Exercise 2.10: Project v1.3
* Exercise 3.03: Project v1.4


These exercises below related to separation of deployment using branch name as namespace were skipped since I already used namespace from previous excercises for project separation instead. There is a [limitation in changing namespace globally for hard-coded namespace with kustomize](https://github.com/kubernetes-sigs/kustomize/issues/880).

* Exercise 3.04: Project v1.4.1
* Exercise 3.04: Project v1.4.2


GKE setup requires the following variables:

```yaml
GKE_PROJECT_ID: "Under <given-sa-name>-<6-random-digits> format"
GKE_SA: "Under <sa-name>@<project-id>.iam.gserviceaccount.com format"
GKE_SA_CREDENTIALS: "Under JSON format"
SOPS_AGE_KEY: "Under PGP format"
```