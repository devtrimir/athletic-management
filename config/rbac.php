<?php

/**
 * RBAC permission catalog.
 *
 * This file is the single source of truth for every permission code in the
 * application.  Run `php artisan rbac:sync` on each deploy to upsert these
 * records into the `permissions` table.
 *
 * IMPORTANT: Never rename a `code` value without also writing a migration that
 * renames the old row.  `rbac:sync` never deletes rows, so a renamed code will
 * create a new row and orphan the old one.
 *
 * Structure per entry:
 *   code     - machine identifier, dot-notation (<resource>.<action>)
 *   group    - groups related permissions in UIs and catalogs
 *   name_hi  - human-readable label in Hindi
 *   name_en  - human-readable label in English
 */
return [
    'permissions' => [

        // ── Members ──────────────────────────────────────────────────────────
        ['code' => 'members.view',   'group' => 'members', 'name_hi' => 'सदस्य देखें',    'name_en' => 'View members'],
        ['code' => 'members.create', 'group' => 'members', 'name_hi' => 'सदस्य जोड़ें',    'name_en' => 'Create members'],
        ['code' => 'members.update', 'group' => 'members', 'name_hi' => 'सदस्य अपडेट करें', 'name_en' => 'Update members'],
        ['code' => 'members.delete', 'group' => 'members', 'name_hi' => 'सदस्य हटाएं',     'name_en' => 'Delete members'],
        ['code' => 'members.manageLegacyAchievements', 'group' => 'members', 'name_hi' => 'पुरानी उपलब्धियाँ प्रबंधित करें', 'name_en' => 'Manage legacy achievements'],
        ['code' => 'members.manageBenefits',           'group' => 'members', 'name_hi' => 'उपलब्धि लाभ प्रबंधित करें',       'name_en' => 'Manage achievement benefits'],

        // ── Coaches ───────────────────────────────────────────────────────────
        ['code' => 'coaches.view',   'group' => 'coaches', 'name_hi' => 'कोच देखें',    'name_en' => 'View coaches'],
        ['code' => 'coaches.create', 'group' => 'coaches', 'name_hi' => 'कोच जोड़ें',    'name_en' => 'Create coaches'],
        ['code' => 'coaches.update', 'group' => 'coaches', 'name_hi' => 'कोच अपडेट करें', 'name_en' => 'Update coaches'],
        ['code' => 'coaches.delete', 'group' => 'coaches', 'name_hi' => 'कोच हटाएं',     'name_en' => 'Delete coaches'],

        // ── Teams ─────────────────────────────────────────────────────────────
        ['code' => 'teams.view',   'group' => 'teams', 'name_hi' => 'टीम देखें',    'name_en' => 'View teams'],
        ['code' => 'teams.create', 'group' => 'teams', 'name_hi' => 'टीम जोड़ें',    'name_en' => 'Create teams'],
        ['code' => 'teams.update', 'group' => 'teams', 'name_hi' => 'टीम अपडेट करें', 'name_en' => 'Update teams'],
        ['code' => 'teams.delete', 'group' => 'teams', 'name_hi' => 'टीम हटाएं',     'name_en' => 'Delete teams'],

        // ── Tournaments ───────────────────────────────────────────────────────
        ['code' => 'tournaments.view',   'group' => 'tournaments', 'name_hi' => 'टूर्नामेंट देखें',    'name_en' => 'View tournaments'],
        ['code' => 'tournaments.create', 'group' => 'tournaments', 'name_hi' => 'टूर्नामेंट जोड़ें',    'name_en' => 'Create tournaments'],
        ['code' => 'tournaments.update', 'group' => 'tournaments', 'name_hi' => 'टूर्नामेंट अपडेट करें', 'name_en' => 'Update tournaments'],
        ['code' => 'tournaments.delete', 'group' => 'tournaments', 'name_hi' => 'टूर्नामेंट हटाएं',     'name_en' => 'Delete tournaments'],

        // ── Imports ───────────────────────────────────────────────────────────
        ['code' => 'imports.run', 'group' => 'imports', 'name_hi' => 'डेटा आयात करें', 'name_en' => 'Run imports'],

        // ── Reports ───────────────────────────────────────────────────────────
        ['code' => 'reports.view', 'group' => 'reports', 'name_hi' => 'रिपोर्ट देखें', 'name_en' => 'View reports'],

        // ── Users ─────────────────────────────────────────────────────────────
        ['code' => 'users.manage', 'group' => 'users', 'name_hi' => 'उपयोगकर्ता प्रबंधित करें', 'name_en' => 'Manage users'],

        // ── Settings ──────────────────────────────────────────────────────────
        ['code' => 'settings.manage', 'group' => 'settings', 'name_hi' => 'सेटिंग प्रबंधित करें', 'name_en' => 'Manage settings'],

        // ── Reference data ────────────────────────────────────────────────────
        ['code' => 'reference_data.manage', 'group' => 'reference_data', 'name_hi' => 'संदर्भ डेटा प्रबंधित करें', 'name_en' => 'Manage reference data'],

    ],
];
