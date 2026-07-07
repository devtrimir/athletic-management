import { Head } from '@inertiajs/react';
import { useEffect } from 'react';
import { useTranslation } from '@/hooks/use-translation';

type Team = {
    id: number;
    name: string;
    in_charge: string | null;
    has_current_incharge: boolean;
    current_incharge_rank: string | null;
    current_incharge_name: string | null;
    current_incharge_pno: string | null;
    current_incharge_designation: string | null;
    current_incharge_mobile: string | null;
    sport: {
        id: number;
        name: string;
    } | null;
    location_label: string | null;
};

type Session = {
    id: number;
    name: string;
};

type TeamMemberRow = {
    id: number;
    role: string | null;
    joined_on: string | null;
    left_on: string | null;
    member: {
        id: number;
        full_name: string;
        member_code: string | null;
        pno: string | null;
        player_category: string | null;
        rank: string | null;
        designation: string | null;
        mobile: string | null;
        playable_profile: {
            sport_event: string | null;
            role: string | null;
            position: string | null;
        } | null;
        current_unit: {
            id: number;
            name: string;
        } | null;
    } | null;
    session: {
        id: number;
        name: string;
    } | null;
};

type TeamCoachRow = {
    id: number;
    role: string | null;
    assigned_at: string | null;
    coach: {
        id: number;
        full_name: string;
        pno: string | null;
        sport_profile: {
            sport_event: string | null;
            level: string | null;
        } | null;
    } | null;
    session: {
        id: number;
        name: string;
    } | null;
};

type TeamPrintReport = {
    team: Team;
    members: TeamMemberRow[];
    removedMembers: TeamMemberRow[];
    coaches: TeamCoachRow[];
};

function escapeHtml(value: string | null | undefined): string {
    const text = value ?? '';

    return text
        .replaceAll('&', '&amp;')
        .replaceAll('<', '&lt;')
        .replaceAll('>', '&gt;')
        .replaceAll('"', '&quot;')
        .replaceAll("'", '&#39;');
}

function normalizeDate(value: string | null | undefined): string {
    const trimmed = value?.trim() ?? '';
    if (!trimmed) {
        return '';
    }

    if (trimmed.includes('T')) {
        return trimmed.split('T')[0] ?? '';
    }

    if (trimmed.includes(' ')) {
        return trimmed.split(' ')[0] ?? '';
    }

    return trimmed;
}

function slugifyFileName(value: string): string {
    return value
        .toLowerCase()
        .trim()
        .replace(/\s+/g, '-')
        .replace(/[^a-z0-9-]/g, '-')
        .replace(/-+/g, '-')
        .replace(/^-+|-+$/g, '');
}

const LETTERHEAD_LOGO_SRC = '/logo.jpg';
const PRINT_HEADING = 'UP Police Sports Control Board (UPPSCB)';

export default function TeamsPrint({
    team,
    sessions = [],
    selectedSessionId,
    members = [],
    removedMembers = [],
    coaches = [],
    printTeams = [],
}: {
    team: Team;
    sessions?: Session[];
    selectedSessionId: number | null;
    members?: TeamMemberRow[];
    removedMembers?: TeamMemberRow[];
    coaches?: TeamCoachRow[];
    printTeams?: TeamPrintReport[];
}) {
    const { t } = useTranslation();

    const selectedSession = sessions.find(
        (session) => session.id === selectedSessionId,
    );

    const isGDPlayer = (member: TeamMemberRow) =>
        (member.member?.player_category ?? '').toUpperCase() === 'GD';
    const isSportQuotaPlayer = (member: TeamMemberRow) => {
        const category = (member.member?.player_category ?? '')
            .toUpperCase()
            .trim();

        return category !== '' && category !== 'GD';
    };

    const cleanText = (value: string | null | undefined): string =>
        value?.trim() ?? '';

    const isCurrentSessionMember = (member: TeamMemberRow): boolean =>
        selectedSessionId !== null && member.session?.id === selectedSessionId;

    const formatLeftDate = (member: TeamMemberRow): string => {
        const leftOn = normalizeDate(member.left_on);
        const isCurrentSessionAndNoDate =
            isCurrentSessionMember(member) &&
            (leftOn === '' || leftOn.startsWith('0000-00-00'));

        if (isCurrentSessionAndNoDate) {
            return '';
        }

        if (leftOn === '' || leftOn.startsWith('0000-00-00')) {
            return '';
        }

        if (isCurrentSessionMember(member)) {
            return '';
        }

        return leftOn;
    };

    const normalizeTag = (value: string | null | undefined): string => {
        const trimmed = value?.trim();

        if (!trimmed) {
            return '';
        }

        const upper = trimmed.toUpperCase();

        if (upper === 'MEN') {
            return 'Men';
        }

        if (upper === 'WOMEN') {
            return 'Women';
        }

        if (upper === 'GD') {
            return 'GD';
        }

        return trimmed
            .toLowerCase()
            .replace(/[_-]+/g, ' ')
            .replace(/\s+/g, ' ')
            .trim()
            .split(' ')
            .filter(Boolean)
            .map((word) => {
                const normalizedWord = word.toUpperCase();

                if (
                    normalizedWord === word.toUpperCase() &&
                    normalizedWord.length <= 4
                ) {
                    return normalizedWord;
                }

                return `${word[0].toUpperCase()}${word.slice(1)}`;
            })
            .join(' ');
    };

    const memberRank = (member: TeamMemberRow): string =>
        cleanText(member.member?.rank);

    const eventProfileText = (member: TeamMemberRow): string => {
        const profile = member.member?.playable_profile;
        const fields = [profile?.sport_event, profile?.position, profile?.role]
            .map(cleanText)
            .filter(Boolean);

        return fields.join(' / ');
    };

    const renderMemberRows = (
        rows: TeamMemberRow[],
        showLeftOnColumn: boolean,
    ) =>
        rows
            .map((member, index) => {
                const player = member.member;
                const name = cleanText(player?.full_name);
                const posting = [cleanText(player?.designation), cleanText(player?.current_unit?.name)]
                    .filter(Boolean)
                    .join(' / ');

                return `<tr>
                        <td>${index + 1}</td>
                        <td>${escapeHtml(eventProfileText(member))}</td>
                        <td>${escapeHtml(memberRank(member))}</td>
                        <td>${escapeHtml(player?.pno)}</td>
                        <td>${escapeHtml(name)}</td>
                        <td>${escapeHtml(cleanText(member.role))}</td>
                        <td>${escapeHtml(posting || '')}</td>
                        <td>${escapeHtml(normalizeDate(member.joined_on))}</td>
                        ${showLeftOnColumn ? `<td>${escapeHtml(formatLeftDate(member))}</td>` : ''}
                        <td>${escapeHtml(player?.mobile)}</td>
                        <td>${escapeHtml(normalizeTag(player?.player_category))}</td>
                    </tr>`;
            })
            .join('');

    const renderCoachRows = (rows: TeamCoachRow[]) =>
        rows
            .map((coachAssignment, index) => `
                        <tr>
                            <td>${index + 1}</td>
                            <td>${escapeHtml(coachAssignment.coach?.full_name)}</td>
                            <td>${escapeHtml(coachAssignment.coach?.pno)}</td>
                            <td>${escapeHtml(cleanText(coachAssignment.coach?.sport_profile?.sport_event))}</td>
                            <td>${escapeHtml(cleanText(coachAssignment.role))}</td>
                            <td>${escapeHtml(cleanText(coachAssignment.session?.name))}</td>
                        </tr>`)
            .join('');

    const inchargeLineFor = (printTeam: Team): string => {
        const inchargeName = printTeam.current_incharge_name || printTeam.in_charge;
        const inchargeTitle =
            printTeam.current_incharge_rank && inchargeName
                ? `${printTeam.current_incharge_rank} ${inchargeName}`
                : inchargeName;

        return [
            inchargeTitle,
            printTeam.current_incharge_designation,
            printTeam.current_incharge_pno,
            printTeam.current_incharge_mobile,
        ]
            .map(cleanText)
            .filter(Boolean)
            .join(' | ');
    };

    const normalizePrintSection = (value: string): string => {
        const normalized = value.toLowerCase().trim().replace(/\s+/g, '_');

        if (normalized === 'sports_quota' || normalized === 'sports-quota') {
            return 'sport_quota';
        }

        return normalized;
    };

    const renderPlayerSection = (
        sectionKey: string,
        title: string,
        activeRows: string,
        showLeftOnColumn: boolean,
        isVisible: boolean,
    ) => `
                    <section class="sheet print-section" data-print-section="${sectionKey}" style="display:${isVisible ? 'block' : 'none'}">
                        <h2>${title}</h2>
                        <div class="table-wrap">
                            <table class="player-table">
                                <thead>
                                <tr>
                                    <th class="num">${t('S.No.')}</th>
                                    <th>${t('Event / Weight')}</th>
                                    <th>${t('Rank')}</th>
                                    <th>${t('PNO')}</th>
                                    <th>${t('Name')}</th>
                                    <th>${t('Role')}</th>
                                    <th>${t('Posting')}</th>
                                    <th>${t('Joined on')}</th>
                                    ${showLeftOnColumn ? `<th>${t('Left on')}</th>` : ''}
                                    <th>${t('Mobile')}</th>
                                    <th>${t('Level')}</th>
                                </tr>
                                </thead>
                                <tbody>
                                    ${
                                        activeRows ||
                                        `<tr><td colspan="${showLeftOnColumn ? 11 : 10}" class="muted">${t('No players in this session.')}</td></tr>`
                                    }
                                </tbody>
                            </table>
                        </div>
                    </section>`;

    const renderRemovedSection = (
        rows: string,
        showLeftOnColumn: boolean,
        isVisible: boolean,
        heading = t('Removed players'),
    ) => `
                    <section class="sheet print-section" data-print-section="removed" style="display:${isVisible ? 'block' : 'none'}">
                        <h3>${heading}</h3>
                        <div class="table-wrap">
                            <table class="player-table">
                                <thead>
                                    <tr>
                                        <th class="num">${t('S.No.')}</th>
                                        <th>${t('Event / Weight')}</th>
                                        <th>${t('Rank')}</th>
                                        <th>${t('PNO')}</th>
                                        <th>${t('Name')}</th>
                                        <th>${t('Role')}</th>
                                        <th>${t('Posting')}</th>
                                        <th>${t('Joined on')}</th>
                                        ${showLeftOnColumn ? `<th>${t('Left on')}</th>` : ''}
                                        <th>${t('Mobile')}</th>
                                        <th>${t('Level')}</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    ${
                                        rows ||
                                        `<tr><td colspan="${showLeftOnColumn ? 11 : 10}" class="muted">${t('No removed players in this session.')}</td></tr>`
                                    }
                                </tbody>
                            </table>
                        </div>
                    </section>`;

    const renderCoachesSection = (isVisible: boolean, coachRows: string) => `
                    <section class="sheet" data-print-section="coaches" style="display:${isVisible ? 'block' : 'none'}">
                        <h2>${t('Coaches')}</h2>
                        <div class="table-wrap">
                            <table class="coach-table">
                                <thead>
                                    <tr>
                                        <th class="num">${t('S.No.')}</th>
                                        <th>${t('Name')}</th>
                                        <th>${t('PNO')}</th>
                                        <th>${t('Event / Weight')}</th>
                                        <th>${t('Role')}</th>
                                        <th>${t('Session')}</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    ${
                                        coachRows || `<tr><td colspan="6" class="muted">${t('No coaches assigned in this session.')}</td></tr>`
                                    }
                                </tbody>
                            </table>
                        </div>
                    </section>`;

    useEffect(() => {
        const params = new URLSearchParams(
            typeof window === 'undefined' ? '' : window.location.search,
        );
        const printSections = params
            .get('print_sections')
            ?.split(',')
            .map(normalizePrintSection)
            .filter(Boolean) ?? ['all'];

        const printPageMode =
            params.get('page_mode')?.trim().toLowerCase() === 'portrait'
                ? 'portrait'
                : 'landscape';

        const sectionSet = new Set(printSections);
        const includeDefaultSections =
            sectionSet.size === 0 || sectionSet.has('all');
        const hasRemovedMembers =
            printTeams.length > 0
                ? printTeams.some((report) => report.removedMembers.length > 0)
                : removedMembers.length > 0;
        const showAll = includeDefaultSections;
        const showGD = sectionSet.has('gd');
        const showSportQuota = sectionSet.has('sport_quota');
        const showRemoved =
            hasRemovedMembers &&
            (includeDefaultSections || sectionSet.has('removed'));
        const showCoaches = includeDefaultSections || sectionSet.has('coaches');

        const reports: TeamPrintReport[] =
            printTeams.length > 0
                ? printTeams
                : [{ team, members, removedMembers, coaches }];
        const renderTeamReport = (report: TeamPrintReport): string => {
            const reportMembers = report.members;
            const reportRemovedMembers = report.removedMembers;
            const reportCoaches = report.coaches;
            const allPlayersShowLeftOn =
                reportMembers.some((member) => formatLeftDate(member) !== '') ||
                reportRemovedMembers.some((member) => formatLeftDate(member) !== '');
            const gdPlayers = reportMembers.filter((member) =>
                isGDPlayer(member),
            );
            const gdRemovedPlayers = reportRemovedMembers.filter((member) =>
                isGDPlayer(member),
            );
            const gdPlayersShowLeftOn =
                gdPlayers.some((member) => formatLeftDate(member) !== '') ||
                gdRemovedPlayers.some((member) => formatLeftDate(member) !== '');
            const sportQuotaPlayers = reportMembers.filter((member) =>
                isSportQuotaPlayer(member),
            );
            const sportQuotaRemovedPlayers = reportRemovedMembers.filter((member) =>
                isSportQuotaPlayer(member),
            );
            const sportQuotaPlayersShowLeftOn =
                sportQuotaPlayers.some((member) => formatLeftDate(member) !== '') ||
                sportQuotaRemovedPlayers.some((member) => formatLeftDate(member) !== '');

            const allPlayerRows = renderMemberRows(reportMembers, allPlayersShowLeftOn);
            const allRemovedPlayerRows = renderMemberRows(
                reportRemovedMembers,
                allPlayersShowLeftOn,
            );
            const gdPlayerRows = renderMemberRows(gdPlayers, gdPlayersShowLeftOn);
            const gdRemovedPlayerRows = renderMemberRows(
                gdRemovedPlayers,
                gdPlayersShowLeftOn,
            );
            const sportQuotaPlayerRows = renderMemberRows(
                sportQuotaPlayers,
                sportQuotaPlayersShowLeftOn,
            );
            const sportQuotaRemovedPlayerRows = renderMemberRows(
                sportQuotaRemovedPlayers,
                sportQuotaPlayersShowLeftOn,
            );
            const hasPlayerSection = showAll || showGD || showSportQuota;
            const reportShowRemoved = showRemoved && reportRemovedMembers.length > 0;
            const sectionOne = renderPlayerSection(
                'all',
                t('Active players'),
                allPlayerRows,
                allPlayersShowLeftOn,
                showAll,
            );
            const sectionGD = renderPlayerSection(
                'gd',
                t('GD players'),
                gdPlayerRows,
                gdPlayersShowLeftOn,
                showGD,
            );
            const sectionSportQuota = renderPlayerSection(
                'sport_quota',
                t('Sport quota players'),
                sportQuotaPlayerRows,
                sportQuotaPlayersShowLeftOn,
                showSportQuota,
            );
            const coachSection = renderCoachesSection(
                showCoaches,
                renderCoachRows(reportCoaches),
            );
            const removedSection = renderRemovedSection(
                allRemovedPlayerRows,
                allPlayersShowLeftOn,
                reportShowRemoved && showAll,
                t('Removed players'),
            );
            const gdRemovedSection = renderRemovedSection(
                gdRemovedPlayerRows,
                gdPlayersShowLeftOn,
                reportShowRemoved && showGD && !showAll,
                t('Removed GD players'),
            );
            const sportQuotaRemovedSection = renderRemovedSection(
                sportQuotaRemovedPlayerRows,
                sportQuotaPlayersShowLeftOn,
                reportShowRemoved && showSportQuota && !showAll,
                t('Removed sports quota players'),
            );

            const removableSections: string[] = [];
            if (hasPlayerSection) {
                if (showAll) {
                    removableSections.push(removedSection);
                }

                if (showGD && !showAll) {
                    removableSections.push(gdRemovedSection);
                }

                if (showSportQuota && !showAll) {
                    removableSections.push(sportQuotaRemovedSection);
                }
            } else if (reportShowRemoved) {
                removableSections.push(removedSection);
            }

            const reportInchargeLine = inchargeLineFor(report.team);

            return `
                    <section class="team-block">
                        <header class="team-head">
                            <h2>${escapeHtml(report.team.name)}</h2>
                            <p class="meta">${t('Sport')}: ${escapeHtml(report.team.sport?.name ?? '')}</p>
                            <p class="meta">${t('Location')}: ${escapeHtml(report.team.location_label ?? '')}</p>
                            <p class="meta">${t('Total members')}: ${reportMembers.length + reportRemovedMembers.length}</p>
                            <p class="meta"><strong>${t('Team prabhari')}</strong>: ${escapeHtml(reportInchargeLine || t('Not assigned'))}</p>
                        </header>
                        ${coachSection}
                        ${showAll ? sectionOne : ''}
                        ${showGD ? sectionGD : ''}
                        ${showSportQuota ? sectionSportQuota : ''}
                        ${removableSections.join('')}
                    </section>`;
        };
        const teamBlocks = reports.map(renderTeamReport).join('');
        const isBulkPrint = printTeams.length > 0;
        const documentTitle = isBulkPrint
            ? t('Teams roster')
            : `${team.name} - ${t('Team roster')}`;

        const style = `
            :root{
                --line:#d1d5db;
                --ink:#0f172a;
                --muted:#6b7280;
                --head:#111827;
                --head-bg:#e5edff;
            }
            body{
                font-family:Arial,Helvetica,sans-serif;
                font-size:10px;
                padding:8mm;
                color:var(--ink);
            }
            .letterhead{
                display:flex;
                align-items:center;
                justify-content:center;
                gap:10px;
                border-bottom:1px solid #334155;
                padding-bottom:6px;
                margin-bottom:8px;
                text-align:center;
            }
            .letterhead-logo{
                width:50px;
                height:50px;
                object-fit:contain;
                object-position:center;
            }
            .letterhead-title{
                font-size:15px;
                margin:0;
                line-height:1.2;
                text-transform:uppercase;
                font-weight:700;
            }
            .letterhead-subtitle{
                margin:2px 0 0;
                font-size:10px;
                color:var(--muted);
                font-weight:600;
                text-transform:uppercase;
            }
            .doc-head{
                margin:0 0 8px;
                text-align:center;
            }
            .doc-title{
                margin:0;
                font-size:16px;
                letter-spacing:0.4px;
            }
            .doc-subtitle{
                margin:2px 0 0;
                color:var(--muted);
            }
            .meta{
                margin:3px 0;
                color:var(--head);
            }
            .team-block{
                margin-top:10px;
                break-inside:avoid;
                page-break-inside:avoid;
            }
            .team-block + .team-block{
                break-before:page;
                page-break-before:always;
            }
            .team-head{
                margin:8px 0 6px;
                padding:5px 6px;
                border:1px solid var(--line);
                background:#f8fafc;
            }
            .team-head h2{
                margin:0 0 3px;
            }
            .sheet{
                margin-top:12px;
                border:1px solid var(--line);
                padding:6px 6px 2px;
                break-inside:avoid;
            }
            h2{
                margin:0 0 4px;
                font-size:12px;
                text-transform:uppercase;
                color:var(--head);
            }
            h3{
                margin:10px 0 4px;
                font-size:11px;
                color:var(--head);
            }
            .table-wrap{
                overflow-x:auto;
                margin-bottom:8px;
            }
            .player-table{
                width:100%;
                border-collapse:collapse;
                table-layout:fixed;
            }
            .player-table th,
            .player-table td{
                border:1px solid var(--line);
                padding:3px 4px;
                text-align:center;
                vertical-align:middle;
                font-size:9px;
                line-height:1.2;
                word-break:break-word;
            }
            .player-table .num{
                width:4%;
                text-align:center;
            }
            .player-table th{
                background:var(--head-bg);
                font-weight:600;
                color:var(--head);
            }
            .player-table th:nth-child(1),
            .player-table td:nth-child(1){width:4%;}
            .player-table th:nth-child(2),
            .player-table td:nth-child(2){width:24%;}
            .player-table th:nth-child(3),
            .player-table td:nth-child(3){width:7%;}
            .player-table th:nth-child(4),
            .player-table td:nth-child(4){width:8%;}
            .player-table th:nth-child(5),
            .player-table td:nth-child(5){width:13%;}
            .player-table th:nth-child(6),
            .player-table td:nth-child(6){width:8%;}
            .player-table th:nth-child(7),
            .player-table td:nth-child(7){width:9%;}
            .player-table th:nth-child(8),
            .player-table td:nth-child(8){width:7%;}
            .player-table th:nth-child(9),
            .player-table td:nth-child(9){width:7%;}
            .player-table th:nth-child(10),
            .player-table td:nth-child(10){width:8%;}
            .player-table th:nth-child(11),
            .player-table td:nth-child(11){width:5%;}
            .coach-table{
                width:100%;
                border-collapse:collapse;
                table-layout:fixed;
            }
            .coach-table th,
            .coach-table td{
                border:1px solid var(--line);
                padding:3px 4px;
                text-align:center;
                vertical-align:middle;
                font-size:9px;
                line-height:1.2;
                word-break:break-word;
            }
            .coach-table th{
                background:var(--head-bg);
                font-weight:600;
                color:var(--head);
            }
            .muted{color:var(--muted)}
            .print-toolbar{
                display:flex;
                flex-wrap:wrap;
                justify-content:space-between;
                align-items:flex-start;
                gap:10px;
                margin-bottom:10px;
            }
            .print-controls{
                display:flex;
                flex-wrap:wrap;
                gap:10px;
                align-items:center;
            }
            .print-option{
                display:flex;
                align-items:center;
                gap:6px;
                font-size:11px;
            }
            .print-option input{
                width:14px;
                height:14px;
                accent-color:#0f172a;
            }
            .print-button{padding:8px 14px;background:#0f172a;color:#ffffff;border:0;border-radius:6px;font-size:12px;font-weight:600;cursor:pointer}
            .no-print{display:none}
            @media screen{
                .sheet{
                    box-shadow:0 1px 2px rgba(15,23,42,0.08);
                }
            }
            @page{size:A4 ${printPageMode};margin:8mm}
            @media print{
                html,body{margin:0}
                body{padding:6mm}
                .print-toolbar{
                    display:none !important
                }
                .doc-title{font-size:16px}
                .player-table th,
                .player-table td{
                    font-size:8px !important;
                }
                .sheet{
                    break-inside:avoid;
                    page-break-inside:avoid;
                }
                .print-toolbar{display:none !important}
            }
        `;
        const safeDate = normalizeDate(new Date().toISOString()).replace(/-/g, '');
        const safeName = slugifyFileName(
            isBulkPrint
                ? `uppscb-teams-${selectedSession?.name ?? 'session'}-${safeDate}`
                : `uppscb-team-${team.name}-${team.id}-${safeDate}`,
        );

        const html = `<!doctype html>
            <html>
                <head>
                    <meta charset="utf-8" />
                <meta name="viewport" content="width=device-width,initial-scale=1" />
                    <title>${escapeHtml(safeName)}</title>
                    <style>${style}</style>
                </head>
                <body>
                    <div class="print-toolbar">
                        <div class="print-controls">
                            <label class="print-option">
                                <input
                                    type="checkbox"
                                    id="toggle-section-all"
                                    data-print-toggle="all"
                                    ${showAll ? 'checked' : ''}
                                />
                                <span>${t('Active players')}</span>
                            </label>
                            <label class="print-option">
                                <input
                                    type="checkbox"
                                    id="toggle-section-gd"
                                    data-print-toggle="gd"
                                    ${showGD ? 'checked' : ''}
                                />
                                <span>${t('GD players')}</span>
                            </label>
                            <label class="print-option">
                                <input
                                    type="checkbox"
                                    id="toggle-section-sport-quota"
                                    data-print-toggle="sport_quota"
                                    ${showSportQuota ? 'checked' : ''}
                                />
                                <span>${t('Sport quota players')}</span>
                            </label>
                            <label class="print-option">
                                <input
                                    type="checkbox"
                                    id="toggle-section-coaches"
                                    data-print-toggle="coaches"
                                    ${showCoaches ? 'checked' : ''}
                                />
                                <span>${t('Coaches')}</span>
                            </label>
                            ${hasRemovedMembers ? `<label class="print-option">
                                <input
                                    type="checkbox"
                                    id="toggle-section-removed"
                                    data-print-toggle="removed"
                                    ${showRemoved ? 'checked' : ''}
                                />
                                <span>${t('Removed players')}</span>
                            </label>` : ''}
                        </div>
                        <button type="button" class="print-button" id="team-print-btn">${t(
                            'Print',
                        )}</button>
                    </div>
                    <div class="letterhead">
                        <img
                            class="letterhead-logo"
                            src="${escapeHtml(LETTERHEAD_LOGO_SRC)}"
                            alt="${escapeHtml(PRINT_HEADING)}"
                        />
                        <div>
                            <div class="letterhead-title">${escapeHtml(
                                t(PRINT_HEADING),
                            )}</div>
                            <div class="letterhead-subtitle">${escapeHtml(
                                t('Team roster report'),
                            )}</div>
                        </div>
                    </div>
                    <header class="doc-head">
                        <h1 class="doc-title">${escapeHtml(documentTitle)}</h1>
                        <p class="doc-subtitle">${escapeHtml(t('UP Police Sports Control Board (UPPSCB)'))}</p>
                    </header>
                    <p class="meta">${t('Session')}: ${escapeHtml(selectedSession?.name ?? '')}</p>
                    ${teamBlocks}
                    <script>
                        (function () {
                            const controls = [
                                'all',
                                'gd',
                                'sport_quota',
                                'coaches',
                                'removed',
                            ].map((key) => {
                                const element =
                                    document.querySelector(
                                        '[data-print-toggle=\"' + key + '\"]',
                                    );

                                return {
                                    key,
                                    element:
                                        element instanceof HTMLInputElement
                                            ? element
                                            : null,
                                };
                            });

                            function selectedSections() {
                                return controls
                                    .filter((control) => control.element?.checked)
                                    .map((control) => control.key);
                            }

                            function syncSections() {
                                const selected = new Set(selectedSections());

                                controls.forEach((control) => {
                                    const targets =
                                        control.key === 'removed'
                                            ? document.querySelectorAll(
                                                  '[data-print-section=\"removed\"]',
                                              )
                                            : document.querySelectorAll(
                                                  '[data-print-section=\"' +
                                                      control.key +
                                                      '\"]',
                                              );

                                    if (!targets.length) {
                                        return;
                                    }

                                    const shouldShow = selected.has(control.key);

                                    targets.forEach((target) => {
                                        if (target instanceof HTMLElement) {
                                            target.style.display = shouldShow
                                                ? 'block'
                                                : 'none';
                                        }
                                    });
                                });
                            }

                            function ensureSelection() {
                                const anyChecked = controls.some(
                                    (control) => control.element?.checked,
                                );

                                if (!anyChecked && controls[0]?.element) {
                                    controls[0].element.checked = true;
                                }

                                syncSections();
                            }

                            function attachToggleListeners() {
                                controls.forEach((control) => {
                                    control.element?.addEventListener('change', () => {
                                        const hasOtherChecked = controls.some(
                                            (item) => item.element?.checked,
                                        );

                                        if (!hasOtherChecked) {
                                            control.element.checked = true;
                                        }

                                        syncSections();
                                    });
                                });
                            }

                            attachToggleListeners();
                            ensureSelection();

                            document
                                .getElementById('team-print-btn')
                                ?.addEventListener('click', function () {
                                    if (selectedSections().length === 0) {
                                        alert(
                                            '${escapeHtml(
                                                t(
                                                    'Select at least one section to print.',
                                                ),
                                            )}',
                                        );
                                        return;
                                    }

                                    window.print();
                                });
                        })();
                    </script>
                </body>
            </html>`;

        document.open();
        document.write(html);
        document.close();
    }, [
        members,
        removedMembers,
        coaches,
        printTeams,
        team,
        selectedSessionId,
        sessions,
        t,
    ]);

    return (
            <Head
                title={`${team.name} — ${t('Team roster')} ${
                    selectedSession?.name ? `(${selectedSession.name})` : ''
                }`}
            />
    );
}
