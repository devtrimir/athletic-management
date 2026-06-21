---
name: product-ui-ux-standards
description: Use whenever designing, building, refactoring, or reviewing UI/UX in this Laravel Inertia React app, including pages, tabs, dashboards, forms, dialogs, tables, cards, empty states, upload controls, action bars, mobile layouts, or any user-facing workflow. Apply a senior product design standard for operational software so screens are useful, polished, accessible, scan-friendly, and consistent without the user needing to request UI cleanup separately.
---

# Product UI UX Standards

## Overview

Build operational software UI as if it will be used repeatedly by busy staff: clear, calm, efficient, and trustworthy. Prefer practical product polish over decorative spectacle.

## Product Standard

Before editing UI, identify the screen's primary job, secondary actions, data density, and risk level. Make the first viewport answer: what is this, what matters, and what can the user do next?

- Put the primary action in a predictable top-right or panel-header position.
- Keep destructive actions visually secondary and icon-based where space is tight.
- Use summary metrics only when they help decisions; avoid decorative stat cards.
- Group related fields by meaning, not database order.
- Make records scan-friendly with clear title, type/status badges, key metadata, and actions.
- Use empty states that explain what belongs there and include the next action.
- Show loading, disabled, upload progress, and validation states where the workflow can wait or fail.
- Prefer restrained spacing, 8px-or-less radii unless the component system differs, and stable dimensions.
- Use icons from `lucide-react` for action affordances and unfamiliar metadata.
- Preserve the app's existing component primitives and Tailwind conventions.

## Layout Rules

For admin/profile/module screens:

- Use a concise header row with title/context on the left and primary action on the right.
- Use tables only when comparison across columns is the core task.
- Use record rows/cards when each item has mixed metadata, notes, files, and actions.
- Avoid nesting cards inside cards. Use bordered panels with internal dividers for related records.
- Make mobile layouts stack naturally and keep actions reachable.
- Keep text sizes appropriate to context; no oversized marketing headings inside tool surfaces.
- Ensure long names, references, filenames, and remarks truncate or wrap intentionally.
- Do not rely on color alone for meaning; pair status with text or icon.

## Forms And Dialogs

Forms should feel deliberate and low-friction:

- Place required fields early.
- Use two-column grids only when labels and inputs remain readable.
- Add helpful affordances for file uploads, date fields, selects, and destructive confirmations.
- Show selected filenames and upload progress for uploads.
- Keep submit/cancel actions aligned at the bottom-right.
- Reset form state on close unless preserving errors is intentional.
- Use validation messages next to the failing field.

## Review Checklist

Before finishing a UI change, check:

- Primary action is obvious and consistently placed.
- Empty state is useful and includes the next action where appropriate.
- Dense data can be scanned without reading every word.
- Long text and filenames do not break the layout.
- Mobile and desktop layouts both work.
- Form errors, disabled states, progress, and destructive actions are handled.
- Icons have accessible labels when icon-only.
- The implementation reuses local UI primitives and does not introduce a new visual language.
- Lint/type/build checks pass for frontend changes.

## This App

This is a Laravel Inertia React monolith for operational sports-unit workflows. Default to quiet, structured, professional admin UI: panels, rows, badges, forms, tabs, and clear actions. Avoid landing-page styling, decorative backgrounds, oversized hero treatments, and UI copy that explains obvious controls.
