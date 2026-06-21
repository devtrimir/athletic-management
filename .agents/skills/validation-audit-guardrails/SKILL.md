---
name: validation-audit-guardrails
description: Use before finishing any Laravel module feature that adds or changes models, tabs, forms, mutations, uploads, controllers, requests, policies, or user-facing workflows in this app. Enforces that validation, authorization, audit logging, changelog visibility, and tests are checked together so new records and related tab data go through the audit process and invalid data cannot silently pass.
---

# Validation Audit Guardrails

## Overview

Every feature with a write path must prove two things before handoff: invalid input is rejected, and valid create/update/delete actions are visible in the audit trail where the user expects to see them.

## Validation Guardrail

For every create/update mutation:

- Use a FormRequest for server validation.
- Keep `$request->validated()` or `$request->safe()` as the controller data source.
- Validate required fields, enum values, foreign keys scoped to the organization, dates, money/number ranges, strings, and file uploads.
- Surface validation errors in the Inertia form next to each field with `InputError`.
- Do not prefill required fields with fake valid defaults that hide validation.
- Add focused Pest tests for invalid store and update payloads with `assertSessionHasErrors()` or JSON `assertInvalid()`.
- Assert invalid submissions do not create or mutate records.

## Audit Guardrail

For every persistent model that belongs to a workflow:

- Add `use Auditable` when the model should be audited.
- Add `#[ObservedBy([AuditObserver::class])]` so Eloquent create/update/delete events write audit logs.
- Make sure the model has `organization_id` when audit rows must be organization-scoped.
- If the model is related to a parent timeline, update `AuditLogBuilder` so parent changelog pages include it.
- Add subject labels, field labels, hidden noisy fields, and resolvers for foreign keys or sensitive file paths.
- Hide confidential file paths in changelog output; show safe labels such as document name, type, size, or `Attached`.
- Add Pest coverage that proves create/update/delete writes audit rows or appears in the parent audit endpoint/changelog.

## Member Module Checklist

For member tabs and related models:

- Mutation routes should redirect back to the relevant route-backed tab.
- The tab payload should include only its own data.
- Any model related to the member profile should either be audited or explicitly documented as not audited.
- `AuditLogBuilder::forMember()` must collect the related entity IDs and created/deleted logs by `member_id` or an equivalent parent key.
- Add tests in `MemberProfileTabsTest.php` for tab payload/validation and in `MemberAuditLogControllerTest.php` for changelog visibility when a member-related model is added.

## Finish Criteria

Before final response:

- Run focused feature tests for the changed workflow.
- Run `vendor/bin/pint --dirty --format agent` after PHP changes.
- Run frontend lint/type/build checks after React or TypeScript changes.
- Mention any validation or audit behavior that remains intentionally out of scope.
