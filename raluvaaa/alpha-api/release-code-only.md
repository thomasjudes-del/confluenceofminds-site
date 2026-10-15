# One-time code-only Worker release

This release path is scoped to the reviewed private-alpha Worker correction. It does not publish the frontend. The checked-in plan is disabled. Review the helper and tests before enabling a release plan on the exact release branch named in the workflow.

## Preconditions and preservation

- The source SHA and Worker SHA-256 are pinned in the helper and plan. Update the SHA only to the exact reviewed commit whose API, private-alpha and shared-UI push workflows all passed. A later branch tip is never substituted. The helper reads Worker bytes from the pinned Git object and checks their hash.
- Before upload and immediately before promotion, read-only public GitHub Actions queries reject other active/queued runs of the two known Worker deployment workflows. Only this release run ID is excluded. Unrelated workflows are neither blocked nor cancelled; unavailable or incomplete run inventories stop this release.
- Existing Cloudflare credentials are available only to the final workflow step. GitHub CI verification is read-only and unauthenticated against this public repository; unavailable or incomplete results block the release.
- The active deployment and latest uploaded version must equal the reviewed baseline. All six existing bindings are inherited by name with `bindings_inherit=strict`. Secret values are never requested or resubmitted. D1 identity, plaintext values and full returned binding metadata are compared internally.
- Unknown runtime/settings/binding fields, test authentication, extra triggers, non-default placement, split traffic or configuration drift stop the release. No settings, secrets, triggers, D1 schema or D1 contents are written.
- Runtime/settings/triggers are read again before upload, before promotion and after promotion. Candidate runtime/bindings must equal baseline metadata. The only mutations are one version upload and one deployment of that exact candidate at 100%.

## Concurrency limitation

The Cloudflare deployments API has no documented compare-and-swap condition. Workflow concurrency serializes this workflow only. An external actor can still change configuration between the final read and promotion. The helper checks immediately afterward and fails on detected drift. Do not interpret these checks as an absolute lock against external changes.

## Checkpoints and recovery

Logs and the job summary retain only safe stage names, source SHA, code hash, baseline deployment/version IDs, candidate version ID and the new deployment ID when known. Raw metadata, credential values, variable values and database IDs are excluded.

Never rerun a failed release blindly. An upload or promotion may have succeeded even when its response was lost. Inspect current deployment/latest-version metadata first. If the candidate was only uploaded, it remains undeployed; the original baseline guard deliberately prevents a second upload from inheriting an unreviewed latest version.

Rollback is a separate, reviewed operation, not an automatic failure handler. Before considering it, establish that the candidate is the sole active version, that no subsequent deployment or configuration change occurred, and that the recorded baseline still has the expected bindings/settings. Promote only the recorded baseline version at 100%, without `force`, then verify runtime/settings/triggers and GET `/v1/health`. A rollback must never restore database contents, run schema SQL, rotate secrets, or discard writes made by users. If secret or runtime drift prevents rollback, stop for review rather than forcing it.

After a successful release, use a read-only GET `/v1/health` check. Do not use an authentication or application-data mutation as an automatic production smoke test.
