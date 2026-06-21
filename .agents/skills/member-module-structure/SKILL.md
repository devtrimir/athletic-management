---
name: member-module-structure
description: "Use whenever working on the Members module in this Laravel Inertia React app, including member listing, create/edit/show pages, route-backed profile tabs, status history, aliases, teams, achievements, promotions, media, audit log, search, exports, tests, or any request that asks to inspect, refactor, extend, debug, or explain member functionality. This skill provides the module map so Codex does not need to rediscover the member structure every time."
---

# Member Module Structure

## Quick Orientation

The member module is the core profile module. It uses Laravel web routes + Inertia React for UI pages, with `/api/v1` endpoints retained for API-shaped interactions such as search, frozen external contracts, or media/audit JSON flows.

The profile page has route-backed tabs. The canonical overview route is lean; tab routes load focused props through `MemberProfileData`.

## Primary Routes

Web routes live in `routes/web.php`.

- `members.index` -> `GET /members` -> `MemberController@index`
- `members.create` -> `GET /members/create` -> `MemberController@create`
- `members.store` -> `POST /members` -> `MemberController@store`
- `members.show` -> `GET /members/{member}` -> overview only
- `members.edit` -> `GET /members/{member}/edit`
- `members.update` -> `PATCH/PUT /members/{member}`
- `members.destroy` -> `DELETE /members/{member}`
- `members.preview` -> `GET /members/{member}/preview`
- `members.export`, `members.export.show` -> Excel exports

Route-backed profile tabs:

- `members.teams` -> `GET /members/{member}/teams`
- `members.events` -> `GET /members/{member}/events`
- `members.performance` -> `GET /members/{member}/performance`
- `members.special-achievements` -> `GET /members/{member}/special-achievements`
- `members.promotions` -> `GET /members/{member}/promotions`
- `members.changelog` -> `GET /members/{member}/changelog`
- `members.media` -> `GET /members/{member}/media`
- `members.status` -> `GET /members/{member}/status`

Profile mutations:

- `members.status.store` -> status change
- `members.aliases.store`, `members.aliases.destroy`
- `members.photo.store`, `members.photo.destroy`
- `members.legacy-achievements.store/update/destroy`
- `members.special-achievements.store/update/destroy`
- `members.special-achievements.order-document` -> authorized private order document download
- `members.special-achievements.order-document.preview` -> authorized private inline order document preview
- `members.promotions.store/update/destroy`
- `achievement-benefits.store/update/destroy`
- `participations.media.*`
- `members.promotions.media.*`

API routes live in `routes/api.php` and should not become the default data path for Inertia profile tabs:

- `v1.search.members`
- `v1.members.preview`
- `v1.members.teams.index`
- `v1.members.participations.index`
- `v1.members.achievements.index`
- `v1.members.media.index`
- `members.audit-log.index` is a web JSON route using the API controller.

## Backend Map

Core controllers:

- `app/Http/Controllers/MemberController.php`
  - index, create, store, overview show, edit, update, destroy, preview.
  - `show()` should stay overview-only.
  - `preview()` uses full printable profile props.
- `app/Http/Controllers/MemberProfileTabController.php`
  - renders route-backed tab pages using `MemberProfileData`.
- `app/Support/Members/MemberProfileData.php`
  - shared payload builder for member profile shell and tabs.
  - methods: `overview`, `teams`, `events`, `performance`, `specialAchievements`, `promotions`, `changelog`, `media`, `status`, `print`.
  - `specialAchievements()` is the focused route-backed payload for standalone member special achievements such as commendation discs.
  - keep heavy tab payloads out of `overview`.

Mutation controllers:

- `MemberStatusController` -> status history + current status.
- `MemberAliasController` -> aliases.
- `MemberPhotoController` -> profile photo.
- `MemberLegacyAchievementController` -> pre/post recruitment achievement rows.
- `MemberSpecialAchievementController` -> standalone member special achievements and recognitions.
- `MemberPromotionController` -> promotion records and evidence links.
- `AchievementBenefitController` -> benefits for legacy/live achievements.
- `MediaFileController` -> participation and promotion media.
- `MemberExportController` -> list/show exports.

API controllers:

- `Api/V1/MemberSearchController` -> search/autocomplete.
- `Api/V1/MemberTeamsController`
- `Api/V1/MemberParticipationsController`
- `Api/V1/MemberAchievementsController`
- `Api/V1/MemberMediaController`
- `Api/V1/MemberAuditLogController`
- `Api/V1/MemberPreviewController`

Important services:

- `App\Services\MemberCodeGenerator`
- `App\Services\MemberSearchService`
- `App\Services\AuditLogBuilder`
- `App\Services\Performance\MemberPerformanceService`
- `App\Services\MediaPathService`

## Requests, Resources, Policies

Member request classes:

- `StoreMemberRequest`, `UpdateMemberRequest`
- `ChangeStatusRequest`
- `StoreAliasRequest`
- `StoreMemberPhotoRequest`
- `StoreLegacyAchievementRequest`, `UpdateLegacyAchievementRequest`
- `StoreMemberSpecialAchievementRequest`, `UpdateMemberSpecialAchievementRequest`
- `StoreMemberPromotionRequest`, `UpdateMemberPromotionRequest`
- `StoreAchievementBenefitRequest`, `UpdateAchievementBenefitRequest`

Shared request classes:

- `StoreMediaFileRequest`
- `StorePromotionMediaFileRequest`
- team-member requests under `app/Http/Requests/Teams/*`

Resources:

- `MemberResource`
- `MemberStatusHistoryResource`
- `NameAliasResource`
- `MediaFileResource`
- `Api/V1/MemberSearchResource`
- `Api/V1/MemberTeamResource`

Policy:

- `MemberPolicy` controls member view/create/update/delete/status/alias/legacy/benefit abilities.
- `MediaPolicy` controls media deletion.

## Data Model

Main member tables/models:

- `members` -> `Member`
- `member_code_sequences`
- `name_aliases`
- `member_status_history` -> `MemberStatusHistory`
- `member_sport`
- `member_legacy_achievements` -> `MemberLegacyAchievement`
- `member_special_achievements` -> `MemberSpecialAchievement`
  - Standalone member recognitions such as `COMMENDATION_DISC`, `APPRECIATION_LETTER`, `HONOUR_CERTIFICATE`, `SPECIAL_RECOGNITION`, or `OTHER`.
  - These are not linked to medals, legacy achievements, participations, or achievement benefits.
  - Supports optional confidential order document upload metadata: `order_document_path`, original name, MIME type, and size.
  - Order documents are stored on the private `local` disk and exposed only through authorized preview/download routes. Do not expose `/storage/...` public URLs for these files. Use `$private-document-uploads` when changing this flow or adding similar confidential uploads elsewhere.
  - Audited through `Auditable` + `AuditObserver`; `AuditLogBuilder::forMember()` includes these records in the member changelog. Use `$validation-audit-guardrails` when adding or changing member-related models/tabs.
- `achievement_benefits` -> `AchievementBenefit`
- `member_promotions` -> `MemberPromotion`
- `promotion_evidences` -> `PromotionEvidence`
- `media_files` -> `MediaFile`

Related performance/history models:

- `team_members` -> `TeamMember`
- `participations` -> `Participation`
- `achievements` -> `Achievement`
- `participation_awards` -> `ParticipationAward`
- `teams`, `sports`, `sport_sessions`, `tournaments`, `events`

Common relationship directions:

- `Member` has many aliases, status history, legacy achievements, promotions, participations, team memberships.
- `Member` has many standalone special achievements.
- `Participation` belongs to member/event/session/team and may have one achievement.
- `Achievement` belongs to participation and has many benefits.
- `MemberPromotion` has many promotion evidences and media.
- `PromotionEvidence` polymorphically references participation, achievement, or member legacy achievement.

## Frontend Map

Pages:

- `resources/js/pages/members/index.tsx`
- `resources/js/pages/members/create.tsx`
- `resources/js/pages/members/edit.tsx`
- `resources/js/pages/members/show.tsx`
- `resources/js/pages/members/print-preview.tsx`

Member components:

- `components/members/member-teams-tab.tsx`
- `components/members/legacy-achievements-tab.tsx`
- `components/members/promotions-tab.tsx`
- `components/members/member-performance-tab.tsx`
- `components/members/special-achievements-tab.tsx`
- `components/members/member-media-tab.tsx`
- `components/members/status-change-modal.tsx`
- `components/members/alias-inline-form.tsx`
- `components/members/participation-media-sheet.tsx`
- `components/members/media-lightbox.tsx`
- `components/members/member-quick-view.tsx`

Shared components used by member tabs:

- `components/shared/confidential-document-preview.tsx` -> browser preview modal plus explicit download action for private documents.

Reusable pickers:

- `components/member-picker.tsx`
- `components/members-multi-select.tsx`

Generated Wayfinder helpers:

- `resources/js/actions/App/Http/Controllers/MemberController.ts`
- `MemberProfileTabController.ts`
- `MemberStatusController.ts`
- `MemberAliasController.ts`
- `MemberPhotoController.ts`
- `MemberLegacyAchievementController.ts`
- `MemberSpecialAchievementController.ts`
- `MemberPromotionController.ts`
- `AchievementBenefitController.ts`
- `MediaFileController.ts`
- API controller helpers under `resources/js/actions/App/Http/Controllers/Api/V1/`
- named routes under `resources/js/routes/members/` and `resources/js/routes/v1/members/`

After route changes, regenerate with:

```bash
php artisan wayfinder:generate --with-form --no-interaction
```

## Route-Backed Profile Tab Rules

- `members.show` is overview-only and should not include heavy tab props.
- `MemberProfileTabController` tab methods render `members/show` with `activeTab`.
- `resources/js/pages/members/show.tsx` keeps one visual profile shell and switches visible content by server-provided `activeTab`.
- Tab triggers use Inertia `<Link>` with Wayfinder URLs and `prefetch`.
- Do not use the member API endpoints to feed tab pages unless the interaction is genuinely API-shaped.
- Keep API contracts unchanged when they already exist.
- Special achievements are standalone member records. Do not merge them with medals, legacy achievements, participations, promotions, or achievement benefits.

Mutation redirect targets:

- status + aliases -> `members.status`
- legacy achievements + achievement benefits -> `members.events`
- standalone special achievements -> `members.special-achievements`
- promotions -> `members.promotions`
- member photo -> `members.media`
- create/update member -> usually `members.show`
- preserve referer/back behavior for cross-module flows like coach-origin mutations.

## Test Map

Focused member tests include:

- `MemberProfileTabsTest.php`
- `MemberShowPropsTest.php`
- `MemberControllerTest.php`
- `MemberTeamsShowTest.php`
- `MemberAliasControllerTest.php`
- `MemberStatusControllerTest.php`
- `MemberLegacyAchievementControllerTest.php`
- `MemberPromotionControllerTest.php`
- `MemberParticipationsAchievementsApiTest.php`
- `MemberPerformanceShowTest.php`
- `MemberAuditLogControllerTest.php`
- `MemberPreviewTest.php`
- `MemberSportFilterTest.php`
- `MemberCodeGeneratorTest.php`
- `Api/V1/MemberSearchTest.php`
- `Api/V1/MemberSearchNormalizationTest.php`
- related media/team/report tests as needed.

Run the smallest affected set first. Useful focused command:

```bash
php artisan test --compact \
  tests/Feature/MemberProfileTabsTest.php \
  tests/Feature/MemberShowPropsTest.php \
  tests/Feature/MemberTeamsShowTest.php \
  tests/Feature/MemberAliasControllerTest.php \
  tests/Feature/MemberStatusControllerTest.php \
  tests/Feature/MemberLegacyAchievementControllerTest.php \
  tests/Feature/MemberPromotionControllerTest.php
```

## Common Change Playbooks

Adding a new profile tab:

1. Add a web route in `routes/web.php`.
2. Add a method to `MemberProfileTabController`.
3. Add a payload method to `MemberProfileData`.
4. Add a tab link and content branch in `members/show.tsx`.
5. Regenerate Wayfinder with `--with-form`.
6. Add route authorization, payload, cross-org, heavy-prop omission, and redirect tests.

Adding a new member field:

1. Add migration/model cast/fillable as needed.
2. Update `StoreMemberRequest` and `UpdateMemberRequest`.
3. Update `MemberResource`.
4. Update create/edit forms and overview display.
5. Add translations for visible strings.
6. Update feature tests for validation and display.

Adding a profile mutation:

1. Add Form Request + controller method.
2. Authorize through `MemberPolicy`.
3. Write audit/media/history side effects as appropriate.
4. Redirect to the relevant profile tab.
5. Add Pest tests for 403, 422, success, cross-org, and redirect.

## Verification

Use Boost docs before implementation when changing Laravel/Inertia/Pest/Wayfinder code. Run:

```bash
vendor/bin/pint --dirty --format agent
npm run lint
npm run types:check
npm run build
```

Expect `npm run lint` may show warnings in the large `members/show.tsx`; errors must be fixed.

## Staleness Check

This skill is a module map, not a substitute for checking changed code. Before major edits, quickly verify current reality with:

```bash
php artisan route:list --name=members --except-vendor
find app/Http/Controllers app/Http/Requests app/Support resources/js/pages/members resources/js/components/members tests/Feature -type f | rg -i 'member|achievement|promotion|media|participation'
```
