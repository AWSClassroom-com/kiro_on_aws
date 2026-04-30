---
inclusion: always
---

# Security Rules

## What counts as a credential in this codebase

Treat any of the following as a hardcoded credential and flag it:

- AWS access key IDs — strings matching `AKIA[A-Z0-9]{16}` (long-term IAM user keys) or `ASIA[A-Z0-9]{16}` (temporary STS keys). Both prefixes are equally important; ASIA keys are now the majority in modern AWS deployments.
- Private keys — anything containing `-----BEGIN ... PRIVATE KEY-----` (RSA, EC, OpenSSH, PGP variants).
- Database connection strings with embedded credentials — `postgres://user:password@…`, `mongodb://…`, `mysql://…`.
- GitHub tokens — strings beginning with `ghp_`, `gho_`, `ghu_`, `ghs_`, or `ghr_`.
- Plain password assignments where the value is a real secret — `password = "…"`, `passwd: …`, `pwd: …`.

## Where credentials must NOT live

Source files (`.ts`, `.tsx`, `.js`, `.jsx`, `.json`, `.yaml`, `.yml`, `.env*`). Anything under `amplify/`, `src/`, or `scripts/`.

## Where credentials SHOULD live

- For service-to-service calls inside AWS: IAM roles. The default credential chain picks them up — no static keys in code.
- For configuration: AWS Systems Manager Parameter Store.
- For credentials that need rotation: AWS Secrets Manager.

## Allowlist — known-safe strings that may match credential patterns

These are documentation/test values and must NOT be flagged as real credentials:

- `AKIAIOSFODNN7EXAMPLE` — AWS's reserved example access key ID. Cannot be activated; safe to commit anywhere.
- `wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY` — AWS's reserved example secret access key.
- Any string ending in the literal word `EXAMPLE` (case-sensitive).
- Strings inside files under `__tests__/` or matching `*.test.ts` / `*.spec.ts` — test fixtures intentionally use placeholder credentials.