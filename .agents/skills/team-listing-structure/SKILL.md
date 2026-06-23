---
name: team-listing-structure
description: Use when working on the Teams listing page, roster count columns, Teams export listing columns, or the session-scoped Men/Women/GD/Sports Quota summary shown in the Teams index table.
---

# Team Listing Structure

## Files

- `app/Http/Controllers/TeamController.php` keeps `index()` thin: authorize, call `TeamListingService`, load filter reference data, render Inertia.
- `app/Services/Teams/TeamListingService.php` owns Teams index query filters, selected session resolution, roster count aggregates, eager loads, and listing status decoration.
- `app/Http/Resources/TeamResource.php` is the listing row payload boundary. Add listing fields here when the service loads them.
- `resources/js/pages/teams/index.tsx` owns the table presentation, print column selection, and export column selection.
- `app/Http/Controllers/TeamExportController.php` must support any listing columns that the Teams index sends through `columns[]`.

## Count Rules

- Team listing roster counts are scoped to the selected sport session.
- Active player counts use `team_members.left_on IS NULL`.
- Men count uses member `gender = M`.
- Women count uses member `gender = F`.
- GD count uses member `player_category = GD`.
- Sports Quota count uses member `player_category != GD`.
- Members with `gender = O` stay in total player counts but are not shown in Men/Women grouped chips.

## UI Convention

- The Teams index table does not repeat Session inside each row because session is already selected in the filter bar.
- The Players column groups information as Men and Women, with each group showing total, GD, and Sports Quota.
- Coaches remain in the Staff column with Captains and Reserves.

## Guardrail

Do not put Teams listing query details back into `TeamController@index`; extend `TeamListingService` and expose new row fields through `TeamResource`.
