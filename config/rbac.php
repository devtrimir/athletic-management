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
        ['code' => 'members.manageBenefits',           'group' => 'members', 'name_hi' => 'उपलब्धि लाभ प्रबंधित करें',       'name_en' => 'Manage achievement benefits'],
        ['code' => 'members.changeStatus',              'group' => 'members', 'name_hi' => 'सदस्य स्थिति बदलें',             'name_en' => 'Change member status'],
        ['code' => 'members.restore',                   'group' => 'members', 'name_hi' => 'सदस्य पुनर्स्थापित करें',        'name_en' => 'Restore member'],
        ['code' => 'members.manageAlias',               'group' => 'members', 'name_hi' => 'सदस्य उपनाम प्रबंधित करें',      'name_en' => 'Manage member aliases'],
        ['code' => 'members.manageSpecialAchievements', 'group' => 'members', 'name_hi' => 'सदस्य विशिष्ट उपलब्धियाँ प्रबंधित करें', 'name_en' => 'Manage member special achievements'],

        // ── Coaches ───────────────────────────────────────────────────────────
        ['code' => 'coaches.view',   'group' => 'coaches', 'name_hi' => 'कोच देखें',    'name_en' => 'View coaches'],
        ['code' => 'coaches.create', 'group' => 'coaches', 'name_hi' => 'कोच जोड़ें',    'name_en' => 'Create coaches'],
        ['code' => 'coaches.update', 'group' => 'coaches', 'name_hi' => 'कोच अपडेट करें', 'name_en' => 'Update coaches'],
        ['code' => 'coaches.delete', 'group' => 'coaches', 'name_hi' => 'कोच हटाएं',     'name_en' => 'Delete coaches'],
        ['code' => 'coaches.export', 'group' => 'coaches', 'name_hi' => 'कोच निर्यात करें', 'name_en' => 'Export coaches'],
        ['code' => 'coaches.print', 'group' => 'coaches', 'name_hi' => 'कोच प्रिंट करें', 'name_en' => 'Print coaches'],
        ['code' => 'coaches.uploadMedia', 'group' => 'coaches', 'name_hi' => 'कोच मीडिया अपलोड करें', 'name_en' => 'Upload coach media'],
        ['code' => 'coaches.deleteMedia', 'group' => 'coaches', 'name_hi' => 'कोच मीडिया हटाएं', 'name_en' => 'Delete coach media'],
        ['code' => 'coaches.manageCertifications', 'group' => 'coaches', 'name_hi' => 'कोच प्रमाणपत्र प्रबंधित करें', 'name_en' => 'Manage coach certifications'],
        ['code' => 'coaches.manageSports', 'group' => 'coaches', 'name_hi' => 'कोच खेल प्रबंधित करें', 'name_en' => 'Manage coach sports'],
        ['code' => 'coaches.manageTeamAssignments', 'group' => 'coaches', 'name_hi' => 'कोच टीम असाइनमेंट प्रबंधित करें', 'name_en' => 'Manage coach team assignments'],
        ['code' => 'coaches.manageStatus', 'group' => 'coaches', 'name_hi' => 'कोच स्थिति प्रबंधित करें', 'name_en' => 'Manage coach status'],
        ['code' => 'coaches.manageAchievements', 'group' => 'coaches', 'name_hi' => 'कोच उपलब्धियाँ प्रबंधित करें', 'name_en' => 'Manage coach achievements'],
        ['code' => 'coaches.managePromotions', 'group' => 'coaches', 'name_hi' => 'कोच पदोन्नति प्रबंधित करें', 'name_en' => 'Manage coach promotions'],
        ['code' => 'coaches.manageRewards', 'group' => 'coaches', 'name_hi' => 'कोच पुरस्कार प्रबंधित करें', 'name_en' => 'Manage coach rewards'],
        ['code' => 'coaches.viewAuditLog', 'group' => 'coaches', 'name_hi' => 'कोच ऑडिट लॉग देखें', 'name_en' => 'View coach audit log'],

        // ── External coaches ────────────────────────────────────────────────
        ['code' => 'external-coaches.view', 'group' => 'external_coaches', 'name_hi' => 'बाहरी कोच देखें', 'name_en' => 'View external coaches'],
        ['code' => 'external-coaches.create', 'group' => 'external_coaches', 'name_hi' => 'बाहरी कोच जोड़ें', 'name_en' => 'Create external coaches'],
        ['code' => 'external-coaches.update', 'group' => 'external_coaches', 'name_hi' => 'बाहरी कोच अपडेट करें', 'name_en' => 'Update external coaches'],
        ['code' => 'external-coaches.delete', 'group' => 'external_coaches', 'name_hi' => 'बाहरी कोच हटाएं', 'name_en' => 'Delete external coaches'],
        ['code' => 'external-coaches.manageStatus', 'group' => 'external_coaches', 'name_hi' => 'बाहरी कोच स्थिति प्रबंधित करें', 'name_en' => 'Manage external coach status'],

        // ── Training venues ─────────────────────────────────────────────────
        ['code' => 'training-venues.view', 'group' => 'training_venues', 'name_hi' => 'प्रशिक्षण स्थल देखें', 'name_en' => 'View training venues'],
        ['code' => 'training-venues.create', 'group' => 'training_venues', 'name_hi' => 'प्रशिक्षण स्थल जोड़ें', 'name_en' => 'Create training venues'],
        ['code' => 'training-venues.update', 'group' => 'training_venues', 'name_hi' => 'प्रशिक्षण स्थल अपडेट करें', 'name_en' => 'Update training venues'],
        ['code' => 'training-venues.delete', 'group' => 'training_venues', 'name_hi' => 'प्रशिक्षण स्थल हटाएं', 'name_en' => 'Delete training venues'],

        // ── External coaching assignments ───────────────────────────────────
        ['code' => 'external-coaching-assignments.view', 'group' => 'external_coaching_assignments', 'name_hi' => 'बाहरी प्रशिक्षण अनुमति देखें', 'name_en' => 'View external coaching assignments'],
        ['code' => 'external-coaching-assignments.create', 'group' => 'external_coaching_assignments', 'name_hi' => 'बाहरी प्रशिक्षण अनुमति जोड़ें', 'name_en' => 'Create external coaching assignments'],
        ['code' => 'external-coaching-assignments.update', 'group' => 'external_coaching_assignments', 'name_hi' => 'बाहरी प्रशिक्षण अनुमति अपडेट करें', 'name_en' => 'Update external coaching assignments'],
        ['code' => 'external-coaching-assignments.delete', 'group' => 'external_coaching_assignments', 'name_hi' => 'बाहरी प्रशिक्षण अनुमति हटाएं', 'name_en' => 'Delete external coaching assignments'],

        // ── External training attendance ────────────────────────────────────
        ['code' => 'external-training-attendances.view', 'group' => 'external_training_attendances', 'name_hi' => 'बाहरी प्रशिक्षण उपस्थिति देखें', 'name_en' => 'View external training attendance'],
        ['code' => 'external-training-attendances.review', 'group' => 'external_training_attendances', 'name_hi' => 'बाहरी प्रशिक्षण उपस्थिति समीक्षा करें', 'name_en' => 'Review external training attendance'],
        ['code' => 'external-training-attendances.accept', 'group' => 'external_training_attendances', 'name_hi' => 'बाहरी प्रशिक्षण उपस्थिति स्वीकार करें', 'name_en' => 'Accept external training attendance'],
        ['code' => 'external-training-attendances.reject', 'group' => 'external_training_attendances', 'name_hi' => 'बाहरी प्रशिक्षण उपस्थिति अस्वीकार करें', 'name_en' => 'Reject external training attendance'],
        ['code' => 'external-training-attendances.correct', 'group' => 'external_training_attendances', 'name_hi' => 'बाहरी प्रशिक्षण उपस्थिति सुधारें', 'name_en' => 'Correct external training attendance'],
        ['code' => 'external-training-attendances.manual-review', 'group' => 'external_training_attendances', 'name_hi' => 'बाहरी प्रशिक्षण उपस्थिति मैनुअल समीक्षा में भेजें', 'name_en' => 'Send external training attendance to manual review'],
        ['code' => 'external-training-attendances.lock', 'group' => 'external_training_attendances', 'name_hi' => 'बाहरी प्रशिक्षण उपस्थिति लॉक करें', 'name_en' => 'Lock external training attendance'],

        // ── External coach performance updates ─────────────────────────────
        ['code' => 'external-coach-performance-updates.view', 'group' => 'external_coach_performance_updates', 'name_hi' => 'बाहरी कोच प्रदर्शन अपडेट देखें', 'name_en' => 'View external coach performance updates'],
        ['code' => 'external-coach-performance-updates.review', 'group' => 'external_coach_performance_updates', 'name_hi' => 'बाहरी कोच प्रदर्शन अपडेट समीक्षा करें', 'name_en' => 'Review external coach performance updates'],

        // ── Incharges ────────────────────────────────────────────────────────
        ['code' => 'incharges.view',   'group' => 'incharges', 'name_hi' => 'प्रभारी देखें',    'name_en' => 'View incharges'],
        ['code' => 'incharges.create', 'group' => 'incharges', 'name_hi' => 'प्रभारी जोड़ें',    'name_en' => 'Create incharges'],
        ['code' => 'incharges.update', 'group' => 'incharges', 'name_hi' => 'प्रभारी अपडेट करें', 'name_en' => 'Update incharges'],
        ['code' => 'incharges.delete', 'group' => 'incharges', 'name_hi' => 'प्रभारी हटाएं',     'name_en' => 'Delete incharges'],

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

        // ── Sports calendars ─────────────────────────────────────────────────
        ['code' => 'sports-calendars.view',   'group' => 'sports_calendars', 'name_hi' => 'खेल कैलेंडर देखें',   'name_en' => 'View sports calendars'],
        ['code' => 'sports-calendars.create', 'group' => 'sports_calendars', 'name_hi' => 'खेल कैलेंडर जोड़ें',   'name_en' => 'Create sports calendars'],
        ['code' => 'sports-calendars.update', 'group' => 'sports_calendars', 'name_hi' => 'खेल कैलेंडर अपडेट करें', 'name_en' => 'Update sports calendars'],

        // ── Imports ───────────────────────────────────────────────────────────
        ['code' => 'imports.run', 'group' => 'imports', 'name_hi' => 'डेटा आयात करें', 'name_en' => 'Run imports'],

        // ── Reports ───────────────────────────────────────────────────────────
        ['code' => 'reports.view', 'group' => 'reports', 'name_hi' => 'रिपोर्ट देखें', 'name_en' => 'View reports'],

        // ── Users ─────────────────────────────────────────────────────────────
        ['code' => 'users.manage', 'group' => 'users', 'name_hi' => 'उपयोगकर्ता प्रबंधित करें', 'name_en' => 'Manage users'],

        // ── Settings ──────────────────────────────────────────────────────────
        ['code' => 'settings.manage', 'group' => 'settings', 'name_hi' => 'सेटिंग प्रबंधित करें', 'name_en' => 'Manage settings'],

        // ── Media ─────────────────────────────────────────────────────────────
        ['code' => 'media.upload', 'group' => 'media', 'name_hi' => 'मीडिया अपलोड करें', 'name_en' => 'Upload media'],
        ['code' => 'media.delete', 'group' => 'media', 'name_hi' => 'मीडिया हटाएं',       'name_en' => 'Delete media'],

        // ── Reference data ────────────────────────────────────────────────────
        ['code' => 'reference_data.manage', 'group' => 'reference_data', 'name_hi' => 'संदर्भ डेटा प्रबंधित करें', 'name_en' => 'Manage reference data'],
        ['code' => 'ranks.manage', 'group' => 'reference_data', 'name_hi' => 'पद प्रबंधित करें', 'name_en' => 'Manage ranks'],
        ['code' => 'designations.manage', 'group' => 'reference_data', 'name_hi' => 'पदनाम प्रबंधित करें', 'name_en' => 'Manage designations'],

    ],
];
