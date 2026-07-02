<?php

declare(strict_types=1);

namespace App\Http\Controllers;

use App\Exports\ReportExport;
use App\Models\Achievement;
use App\Models\Participation;
use App\Models\SportSession;
use App\Models\Tournament;
use App\Support\Tournaments\TournamentProfileData;
use Illuminate\Http\Request;
use Illuminate\Http\Response;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\Gate;
use Maatwebsite\Excel\Facades\Excel;
use Spatie\QueryBuilder\AllowedFilter;
use Spatie\QueryBuilder\QueryBuilder;
use Symfony\Component\HttpFoundation\BinaryFileResponse;

class TournamentExportController extends Controller
{
    private const EVENT_REPORT_TYPE_DETAIL = 'detail';

    private const EVENT_REPORT_TYPE_MEDAL_LOG = 'medal_log';

    private const EVENT_REPORT_TYPE_SUMMARY = 'summary';

    /** @var array<string, string> */
    private const COLUMN_LABELS = [
        'name' => 'Tournament Name',
        'session' => 'Session',
        'tier' => 'Tier',
        'sport' => 'Sport',
        'venue' => 'Venue',
        'date_from' => 'Date From',
        'date_to' => 'Date To',
        'events_count' => 'Events',
        'participants_count' => 'Participants',
        'teams_count' => 'Teams',
        'medals_count' => 'Medals',
        'created_at' => 'Created On',
    ];

    public function index(Request $request): BinaryFileResponse
    {
        Gate::authorize('viewAny', Tournament::class);

        $orgId = (int) $request->user()->organization_id;

        $defaultSessionId = SportSession::where('organization_id', $orgId)
            ->where('is_current', true)
            ->value('id');

        /** @var array<int, string> $columns */
        $columns = $request->query('columns', array_keys(self::COLUMN_LABELS));

        /** @var array<int, string> $ids */
        $ids = $request->query('ids', []);

        if (! empty($ids)) {
            $tournaments = Tournament::whereIn('id', array_map('intval', $ids))
                ->withCount('events')
                ->addSelect($this->aggregateSelects())
                ->with(['session:id,name', 'tier:id,code,label_hi', 'sport:id,name'])
                ->orderBy('name')
                ->get();
        } else {
            $tournaments = QueryBuilder::for(Tournament::class)
                ->allowedFilters([
                    AllowedFilter::exact('session_id'),
                    AllowedFilter::exact('tier_id'),
                    AllowedFilter::exact('sport_id'),
                    AllowedFilter::partial('q', 'name'),
                ])
                ->allowedSorts(['name', 'date_from', 'created_at'])
                ->defaultSort('-date_from')
                ->withCount('events')
                ->addSelect($this->aggregateSelects())
                ->with(['session:id,name', 'tier:id,code,label_hi', 'sport:id,name'])
                ->when(
                    ! $request->has('filter.session_id') && $defaultSessionId,
                    fn ($q) => $q->where('session_id', $defaultSessionId)
                )
                ->get();
        }

        $validColumns = array_intersect($columns, array_keys(self::COLUMN_LABELS));
        $headings = array_map(fn (string $col) => self::COLUMN_LABELS[$col], $validColumns);

        $rows = $tournaments->map(function (Tournament $tournament) use ($validColumns) {
            $row = [];
            foreach ($validColumns as $col) {
                $row[$col] = match ($col) {
                    'session' => $tournament->session?->name,
                    'tier' => $tournament->tier?->label_hi ?? $tournament->tier?->code,
                    'sport' => $tournament->sport?->name,
                    'date_from' => $tournament->date_from?->toDateString(),
                    'date_to' => $tournament->date_to?->toDateString(),
                    'created_at' => $tournament->created_at?->toDateString(),
                    default => $tournament->{$col},
                };
            }

            return $row;
        });

        return Excel::download(
            new ReportExport($rows, array_values($headings), 'Tournaments'),
            'tournaments-'.now()->format('Y-m-d').'.xlsx',
        );
    }

    public function eventsReport(Request $request, Tournament $tournament): Response
    {
        Gate::authorize('view', $tournament);

        $filters = $this->eventFilters($request);
        $reportType = $this->resolveEventReportType($filters['report_type'] ?? null);
        $payload = $this->eventReportPayload($tournament, $filters, $reportType);
        $summary = $payload['summary'];
        $eventRows = $payload['events'];
        $sportRows = $payload['sportRows'];

        return response($this->buildEventsReportHtml(
            tournament: $tournament,
            filters: $filters,
            summary: $summary,
            reportType: $reportType,
            eventRows: $eventRows,
            sportRows: $sportRows,
        ));
    }

    public function eventsExport(Request $request, Tournament $tournament): BinaryFileResponse
    {
        Gate::authorize('view', $tournament);

        $filters = $this->eventFilters($request);
        $reportType = $this->resolveEventReportType($filters['report_type'] ?? null);
        $payload = $this->eventReportPayload($tournament, $filters, $reportType);
        $summary = $payload['summary'];
        $rows = match ($reportType) {
            self::EVENT_REPORT_TYPE_SUMMARY => $payload['sportRows']->map(
                static fn (array $sport): array => [
                    'name' => (string) ($sport['name'] ?? ''),
                    'events_count' => (int) ($sport['events_count'] ?? 0),
                    'participants_count' => (int) ($sport['participants_count'] ?? 0),
                ],
            )->values(),
            self::EVENT_REPORT_TYPE_MEDAL_LOG => $this->eventRowsForMedalLogExport($payload['events']),
            default => $this->eventRowsForDetailExport($payload['events']),
        };
        $headings = match ($reportType) {
            self::EVENT_REPORT_TYPE_SUMMARY => [
                __('Sport'),
                __('Events'),
                __('Participants'),
            ],
            self::EVENT_REPORT_TYPE_MEDAL_LOG => [
                __('Sport'),
                __('Event'),
                __('Gender'),
                __('Type'),
                __('Gold'),
                __('Silver'),
                __('Bronze'),
                __('Merit'),
                __('Total Medals'),
            ],
            default => [
                __('Sport'),
                __('Event'),
                __('Players'),
                __('Gender'),
                __('Type'),
                __('Participants'),
                __('Gold'),
                __('Silver'),
                __('Bronze'),
                __('Merit'),
                __('Total Medals'),
            ],
        };

        $metaRows = $this->buildEventsReportMetaRows(
            $tournament,
            $filters,
            $summary,
            $reportType,
        );

        return Excel::download(
            new ReportExport(
                $rows,
                $headings,
                $tournament->name.' - '.__('Event Report'),
                $metaRows,
                columnWidths: $this->eventReportColumnWidths($reportType),
            ),
            'tournament-events-'.now()->format('Y-m-d').'.xlsx',
        );
    }

    /**
     * @return array<string, mixed>
     */
    private function eventReportColumnWidths(string $reportType): array
    {
        if ($reportType === self::EVENT_REPORT_TYPE_SUMMARY) {
            return [
                'A' => 22,
                'B' => 12,
                'C' => 16,
            ];
        }

        if ($reportType === self::EVENT_REPORT_TYPE_MEDAL_LOG) {
            return [
                'A' => 16,
                'B' => 14,
                'C' => 12,
                'D' => 8,
                'E' => 9,
                'F' => 9,
                'G' => 9,
                'H' => 9,
                'I' => 12,
            ];
        }

        return [
            'A' => 16,
            'B' => 14,
            'C' => 31,
            'D' => 14,
            'E' => 8,
            'F' => 15,
            'G' => 9,
            'H' => 9,
            'I' => 9,
            'J' => 9,
            'K' => 10,
        ];
    }

    /**
     * @return array<string, mixed>
     */
    private function eventReportPayload(Tournament $tournament, array $filters, string $reportType): array
    {
        $raw = (new TournamentProfileData)->events($tournament, $filters);
        $events = collect($raw['events'] ?? []);
        $summary = $this->hydrateSummaryTotals(
            $this->buildEventSummaryFromRows($events),
            $events,
        );
        $sportRows = $this->eventReportSportRows($summary['sports'] ?? []);

        $rows = $events->values()->map(function (array $event, int $index): array {
            $gold = $this->eventMedalCount((array) $event, 'gold');
            $silver = $this->eventMedalCount((array) $event, 'silver');
            $bronze = $this->eventMedalCount((array) $event, 'bronze');
            $merit = $this->eventMedalCount((array) $event, 'merit');

            return [
                'serial_number' => $index + 1,
                'title' => $this->eventDisplayTitle($event),
                'sport_id' => (int) data_get($event, 'sport.id', 0),
                'sport' => (string) data_get($event, 'sport.name', ''),
                'gender' => $this->eventGenderLabel($event['gender_class'] ?? null),
                'players' => $this->eventPlayersText((array) $event),
                'player_names' => $this->eventPlayerNamesText((array) $event),
                'player_pnos' => $this->eventPlayerPnosText((array) $event),
                'player_rows' => $this->eventPlayerRows((array) $event),
                'type' => (string) ($event['event_type'] === 'team' ? __('T') : __('I')),
                'participants' => (int) ($event['participations_count'] ?? 0),
                'gold' => $gold,
                'silver' => $silver,
                'bronze' => $bronze,
                'merit' => $merit,
                'total_medals' => $gold + $silver + $bronze + $merit,
            ];
        },
        );

        if ($reportType === self::EVENT_REPORT_TYPE_SUMMARY) {
            return [
                'events' => collect(),
                'summary' => $summary,
                'sportRows' => $sportRows,
            ];
        }

        return [
            'events' => $rows->values(),
            'summary' => $summary,
            'sportRows' => $sportRows,
        ];
    }

    /**
     * @param  array<string, mixed>  $event
     */
    private function eventDisplayTitle(array $event): string
    {
        $name = $this->sanitizeEventDetail($event['name'] ?? null);
        $discipline = $this->sanitizeEventDetail($event['discipline'] ?? null);
        $weight = $this->sanitizeEventDetail($event['weight_category'] ?? null);

        if (($event['event_source'] ?? null) !== 'official') {
            return $name !== '' ? $name : (string) __('Event');
        }

        $officialTitle = $weight !== '' ? $weight : $this->normalizeOfficialEventDetail($discipline);

        return $officialTitle !== '' ? $officialTitle : ($name !== '' ? $name : (string) __('Event'));
    }

    private function sanitizeEventDetail(mixed $value): string
    {
        $normalized = preg_replace('/\s+/', ' ', trim((string) ($value ?? '')));

        return $normalized ?? '';
    }

    private function normalizeOfficialEventDetail(string $value): string
    {
        $text = trim((string) preg_replace('/\s{2,}/', ' ', str_replace(',', ' / ', $this->sanitizeEventDetail($value))));
        $parts = array_values(array_filter(
            array_map('trim', explode('/', $text)),
            static fn (string $part): bool => $part !== '',
        ));
        $firstPart = $parts[0] ?? '';
        $withoutTotalPrefix = preg_replace('/^(?:powerlifting|weightlifting)\s+(?:total|total\s+points)\s*:?\s*/i', '', $firstPart);
        $withoutSourcePrefix = preg_replace('/^(?:official|provisional)\s*:?\s*/i', '', $withoutTotalPrefix ?? '');

        return trim($withoutSourcePrefix ?? '');
    }

    private function eventGenderLabel(mixed $value): string
    {
        return match (strtoupper(trim((string) ($value ?? '')))) {
            'M' => (string) __('Male'),
            'F' => (string) __('Female'),
            'MIXED' => (string) __('Mixed'),
            'OPEN' => (string) __('Open'),
            default => trim((string) ($value ?? '')),
        };
    }

    /**
     * @param  array<string, mixed>  $event
     */
    private function eventPlayerRows(array $event): array
    {
        $rows = [];
        $rawRows = $event['player_rows'] ?? null;
        if (is_array($rawRows)) {
            $normalizedRows = $this->normalizePlayerRows((array) $rawRows);
            if (! empty($normalizedRows)) {
                return $normalizedRows;
            }
        }

        $playerPreviews = is_array($event['participant_previews'] ?? null)
            ? $event['participant_previews']
            : [];

        $players = is_array($playerPreviews['players'] ?? null)
            ? $playerPreviews['players']
            : [];
        $morePlayers = is_array($playerPreviews['more_players'] ?? null)
            ? $playerPreviews['more_players']
            : [];

        $rows = [];
        foreach (array_merge($players, $morePlayers) as $player) {
            if (! is_array($player)) {
                continue;
            }

            $normalized = $this->normalizePlayerRow($player);
            if ($normalized !== null) {
                $rows[] = $normalized;
            }
        }

        $singleParticipant = is_array($event['single_participant'] ?? null)
            ? $event['single_participant']
            : null;
        if (
            empty($rows)
            && is_array($singleParticipant)
            && ! empty(array_filter($singleParticipant, 'is_scalar'))
        ) {
            $normalized = $this->normalizePlayerRow($singleParticipant);
            if ($normalized !== null) {
                $rows[] = $normalized;
            }
        }

        if (empty($rows)) {
            $playersText = trim((string) ($event['players'] ?? ''));
            if ($playersText !== '') {
                foreach (preg_split('/\r\n|\r|\n/', $playersText) as $line) {
                    $line = trim((string) $line);
                    if ($line === '') {
                        continue;
                    }

                    $playerName = null;
                    $playerPno = null;
                    if (preg_match('/^(.*)\s+\((.*?)\)\s*$/', $line, $matches) === 1) {
                        $playerName = trim((string) $matches[1]);
                        $playerPno = trim((string) $matches[2]);
                    } else {
                        $playerName = $line;
                    }

                    $rows[] = [
                        'name' => $playerName,
                        'pno' => (string) ($playerPno ?? ''),
                    ];
                }
            }
        }

        return $rows;
    }

    /**
     * @param  array<int, mixed>  $rawRows
     * @return array<int, array<string, string>>
     */
    private function normalizePlayerRows(array $rawRows): array
    {
        $rows = [];
        foreach ($rawRows as $player) {
            if (! is_array($player)) {
                continue;
            }

            $normalized = $this->normalizePlayerRow($player);
            if ($normalized !== null) {
                $rows[] = $normalized;
            }
        }

        return $rows;
    }

    /**
     * @param  array<string, mixed>  $player
     * @return array<string, string>|null
     */
    private function normalizePlayerRow(array $player): ?array
    {
        $name = trim((string) (
            $player['name']
            ?? $player['full_name']
            ?? $player['player_name']
            ?? ''
        ));
        if ($name === '') {
            return null;
        }

        $pno = trim((string) (
            $player['pno']
            ?? $player['member_code']
            ?? $player['pno_code']
            ?? ''
        ));

        return [
            'name' => $name,
            'pno' => $pno,
        ];
    }

    /**
     * @param  array<string, mixed>  $event
     */
    private function eventPlayersText(array $event): string
    {
        $rows = $this->eventPlayerRows($event);
        $lines = [];

        foreach ($rows as $row) {
            if (! is_array($row)) {
                continue;
            }

            $name = trim((string) ($row['name'] ?? ''));
            if ($name === '') {
                continue;
            }

            $pno = trim((string) ($row['pno'] ?? ''));
            $lines[] = $pno === '' ? $name : "{$name} ({$pno})";
        }

        return implode(PHP_EOL, $lines);
    }

    /**
     * @param  array<string, mixed>  $event
     */
    private function eventPlayerNamesText(array $event): string
    {
        $rows = $this->eventPlayerRows($event);
        $rowsText = [];

        foreach ($rows as $row) {
            if (! is_array($row)) {
                continue;
            }

            $name = trim((string) ($row['name'] ?? ''));
            if ($name !== '') {
                $rowsText[] = $name;
            }
        }

        return implode(PHP_EOL, $rowsText);
    }

    /**
     * @param  array<string, mixed>  $event
     */
    private function eventPlayerPnosText(array $event): string
    {
        $rows = $this->eventPlayerRows($event);
        $rowsText = [];

        foreach ($rows as $row) {
            if (! is_array($row)) {
                continue;
            }

            $rowsText[] = trim((string) ($row['pno'] ?? ''));
        }

        return implode(PHP_EOL, $rowsText);
    }

    /**
     * @param  array<int, array<string, mixed>>  $eventRows
     * @param \\Illuminate\\Support\\Collection<int, array<string, mixed>> $sportRows
     * @param  array<string, mixed>  $summary
     */
    private function buildEventsReportHtml(
        Tournament $tournament,
        array $filters,
        array $summary,
        string $reportType,
        Collection $eventRows,
        Collection $sportRows,
    ): string {
        $queryText = [];
        foreach ($filters as $key => $value) {
            if ($key === 'report_type' && (string) $value === self::EVENT_REPORT_TYPE_DETAIL) {
                continue;
            }

            if ($value !== null && (string) $value !== '') {
                $queryText[] = sprintf('%s=%s', (string) $key, (string) $value);
            }
        }

        $title = e($tournament->name);
        $session = e($tournament->session?->name ?? '—');
        $eventGroups = $this->groupEventRowsBySport($eventRows)->values();
        $eventRowsHtml = $eventGroups
            ->flatMap(function (array $group, int $groupIndex): array {
                $events = collect($group['events'] ?? []);
                $rows = [];
                $sportName = e((string) ($group['sport_name'] ?? __('Unknown sport')));

                $normalized = $events->values()->map(function ($event): array {
                    if (! is_array($event)) {
                        return [
                            'event' => [],
                            'players' => [['name' => '', 'pno' => '']],
                        ];
                    }

                    $players = $this->eventPlayerRows($event);
                    if ($players === []) {
                        $players = [['name' => '', 'pno' => '']];
                    }

                    return [
                        'event' => $event,
                        'players' => $players,
                    ];
                })->values();

                if ($normalized->isNotEmpty()) {
                    $rows[] = '<tr class="sport-row"><th class="num">'.($groupIndex + 1).'</th><th colspan="11"><span>'.$sportName.'</span>'.$this->sportMedalSummaryHtml($events).'</th></tr>';
                }

                $eventIndex = 0;

                foreach ($normalized as $item) {
                    if (! is_array($item) || ! is_array($item['event'] ?? null) || ! is_array($item['players'] ?? null)) {
                        continue;
                    }

                    $event = $item['event'];
                    $players = $item['players'];
                    $eventRowsToSpan = max(1, count($players));
                    $span = $eventRowsToSpan > 1 ? sprintf(' rowspan="%d"', $eventRowsToSpan) : '';

                    $eventGender = e((string) ($event['gender'] ?? ''));
                    $eventType = e((string) $event['type']);
                    $participants = (int) $event['participants'];
                    $gold = (int) $event['gold'];
                    $silver = (int) $event['silver'];
                    $bronze = (int) $event['bronze'];
                    $merit = (int) $event['merit'];
                    $totalMedals = (int) $event['total_medals'];

                    $playerIndex = 0;
                    foreach ($players as $player) {
                        if (! is_array($player)) {
                            continue;
                        }

                        $pno = e((string) ($player['pno'] ?? ''));
                        $name = e((string) ($player['name'] ?? ''));

                        if ($playerIndex === 0) {
                            $rows[] = '<tr>'
                                .'<td class="num"'.$span.'>'.($eventIndex + 1).'</td>'
                                .'<td'.$span.'>'.e((string) $event['title']).'</td>'
                                .'<td>'.$pno.'</td>'
                                .'<td>'.$name.'</td>'
                                .'<td'.$span.'>'.$eventGender.'</td>'
                                .'<td'.$span.'>'.$eventType.'</td>'
                                .'<td class="num"'.$span.'>'.$participants.'</td>'
                                .'<td class="num"'.$span.'>'.$gold.'</td>'
                                .'<td class="num"'.$span.'>'.$silver.'</td>'
                                .'<td class="num"'.$span.'>'.$bronze.'</td>'
                                .'<td class="num"'.$span.'>'.$merit.'</td>'
                                .'<td class="num"'.$span.'>'.$totalMedals.'</td>'
                                .'</tr>';
                        } else {
                            $rows[] = sprintf(
                                '<tr><td>%s</td><td>%s</td></tr>',
                                $pno,
                                $name,
                            );
                        }

                        $playerIndex++;
                    }

                    $eventIndex++;
                }

                if ($eventIndex === 0) {
                    return $rows;
                }

                return $rows;
            })->implode('');

        $medalRowsHtml = $eventGroups
            ->flatMap(function (array $group, int $groupIndex): array {
                $events = collect($group['events'] ?? [])->values();
                $rows = [];
                $sportName = e((string) ($group['sport_name'] ?? __('Unknown sport')));

                if ($events->isNotEmpty()) {
                    $rows[] = '<tr class="sport-row"><th class="num">'.($groupIndex + 1).'</th><th colspan="8"><span>'.$sportName.'</span>'.$this->sportMedalSummaryHtml($events).'</th></tr>';
                }

                foreach ($events as $eventIndex => $event) {
                    if (! is_array($event)) {
                        continue;
                    }

                    $rows[] = '<tr>'
                        .'<td class="num">'.($eventIndex + 1).'</td>'
                        .'<td>'.e((string) ($event['title'] ?? '')).'</td>'
                        .'<td>'.e((string) ($event['gender'] ?? '')).'</td>'
                        .'<td>'.e((string) ($event['type'] ?? '')).'</td>'
                        .'<td class="num">'.(int) ($event['gold'] ?? 0).'</td>'
                        .'<td class="num">'.(int) ($event['silver'] ?? 0).'</td>'
                        .'<td class="num">'.(int) ($event['bronze'] ?? 0).'</td>'
                        .'<td class="num">'.(int) ($event['merit'] ?? 0).'</td>'
                        .'<td class="num">'.(int) ($event['total_medals'] ?? 0).'</td>'
                        .'</tr>';
                }

                return $rows;
            })->implode('');

        $summaryRows = $sportRows
            ->map(
                static fn (array $sport): string => sprintf(
                    '<tr><td>%s</td><td>%s</td><td>%s</td></tr>',
                    e((string) $sport['name']),
                    (string) (int) $sport['events_count'],
                    (string) (int) $sport['participants_count'],
                ),
            )
            ->implode('');
        $tableBody = match ($reportType) {
            self::EVENT_REPORT_TYPE_SUMMARY => $summaryRows === '' ? '<tr><td colspan="3">'.e(__('No sport totals available.')).'</td></tr>' : $summaryRows,
            self::EVENT_REPORT_TYPE_MEDAL_LOG => $medalRowsHtml === '' ? '<tr><td colspan="9">'.e(__('No medal data available.')).'</td></tr>' : $medalRowsHtml,
            default => $eventRowsHtml === '' ? '<tr><td colspan="12">'.e(__('No event data available.')).'</td></tr>' : $eventRowsHtml,
        };
        $detailMode = $reportType === self::EVENT_REPORT_TYPE_DETAIL;
        $medalLogMode = $reportType === self::EVENT_REPORT_TYPE_MEDAL_LOG;

        $metricRows = [
            ...$this->eventReportSummaryRows($summary),
            [__('Mode'), match ($reportType) {
                self::EVENT_REPORT_TYPE_SUMMARY => __('Sport-wise'),
                self::EVENT_REPORT_TYPE_MEDAL_LOG => __('Medal log'),
                default => __('Event-wise'),
            }],
            [__('Note'), match ($reportType) {
                self::EVENT_REPORT_TYPE_SUMMARY => __('Table shows sport-wise totals.'),
                self::EVENT_REPORT_TYPE_MEDAL_LOG => __('Table shows event-wise medal counts only.'),
                default => __('Table shows event-wise medal and participant rows.'),
            },
            ],
        ];
        $metricRowsHtml = collect($metricRows)->map(
            static fn (array $item): string => sprintf(
                '<tr><th>%s</th><td>%s</td></tr>',
                e((string) $item[0]),
                e((string) $item[1]),
            )
        )->implode('');

        $rawDateFrom = $tournament->date_from?->toDateString();
        $rawDateTo = $tournament->date_to?->toDateString();
        $eventDate = $rawDateFrom === null ? '—' : ($rawDateTo === null || $rawDateTo === $rawDateFrom ? $rawDateFrom : ($rawDateFrom.' - '.$rawDateTo));
        $filtersText = empty($queryText) ? e(__('None')) : e(implode(', ', $queryText));
        $goldTotal = (int) ($summary['medal_counts']['GOLD'] ?? 0);
        $silverTotal = (int) ($summary['medal_counts']['SILVER'] ?? 0);
        $bronzeTotal = (int) ($summary['medal_counts']['BRONZE'] ?? 0);
        $meritTotal = (int) ($summary['medal_counts']['MERIT'] ?? 0);
        $totalMedals = $goldTotal + $silverTotal + $bronzeTotal + $meritTotal;
        $detailTotalsRow = '<tr class="total-row"><th colspan="6">'.__('Total').'</th>'
            .'<th class="num">'.(int) ($summary['total_participants'] ?? 0).'</th>'
            .'<th class="num">'.$goldTotal.'</th>'
            .'<th class="num">'.$silverTotal.'</th>'
            .'<th class="num">'.$bronzeTotal.'</th>'
            .'<th class="num">'.$meritTotal.'</th>'
            .'<th class="num">'.$totalMedals.'</th>'
            .'</tr>';
        $medalTotalsRow = '<tr class="total-row"><th colspan="4">'.__('Total').'</th>'
            .'<th class="num">'.$goldTotal.'</th>'
            .'<th class="num">'.$silverTotal.'</th>'
            .'<th class="num">'.$bronzeTotal.'</th>'
            .'<th class="num">'.$meritTotal.'</th>'
            .'<th class="num">'.$totalMedals.'</th>'
            .'</tr>';
        $detailReportColgroup = '<colgroup>'
            .'<col style="width:5%">'
            .'<col style="width:19%">'
            .'<col style="width:9%">'
            .'<col style="width:14%">'
            .'<col style="width:8%">'
            .'<col style="width:4%">'
            .'<col style="width:10%">'
            .'<col style="width:6%">'
            .'<col style="width:6%">'
            .'<col style="width:6%">'
            .'<col style="width:6%">'
            .'<col style="width:8%">'
            .'</colgroup>';
        $medalReportColgroup = '<colgroup>'
            .'<col style="width:6%">'
            .'<col style="width:31%">'
            .'<col style="width:13%">'
            .'<col style="width:6%">'
            .'<col style="width:8%">'
            .'<col style="width:8%">'
            .'<col style="width:8%">'
            .'<col style="width:9%">'
            .'<col style="width:11%">'
            .'</colgroup>';

        $detailReportHead = '<thead><tr>'
            .'<th rowspan="2">'.__('Event S No').'</th>'
            .'<th rowspan="2">'.__('Event').'</th>'
            .'<th colspan="2">'.__('Player').'</th>'
            .'<th rowspan="2">'.__('Gender').'</th>'
            .'<th rowspan="2">'.__('Type').'</th>'
            .'<th rowspan="2">'.__('Participants').'</th>'
            .'<th rowspan="2">'.__('Gold').'</th>'
            .'<th rowspan="2">'.__('Silver').'</th>'
            .'<th rowspan="2">'.__('Bronze').'</th>'
            .'<th rowspan="2">'.__('Merit').'</th>'
            .'<th rowspan="2">'.__('Total Medals').'</th>'
            .'</tr><tr><th>'.__('PNO').'</th><th>'.__('Player Name').'</th></tr></thead>';
        $medalReportHead = '<thead><tr>'
            .'<th>'.__('Event S No').'</th>'
            .'<th>'.__('Event').'</th>'
            .'<th>'.__('Gender').'</th>'
            .'<th>'.__('Type').'</th>'
            .'<th>'.__('Gold').'</th>'
            .'<th>'.__('Silver').'</th>'
            .'<th>'.__('Bronze').'</th>'
            .'<th>'.__('Merit').'</th>'
            .'<th>'.__('Total Medals').'</th>'
            .'</tr></thead>';

        return '<!DOCTYPE html><html><head>'
            .'<meta charset="utf-8">'
            .'<title>'.__('Tournament Event Report').' - '.$title.'</title>'
            .'<style>body{font-family:Arial,Helvetica,sans-serif;font-size:10px;line-height:1.35;padding:12px;color:#111}h1{font-size:18px;margin:0 0 6px}h2{font-size:13px;margin:12px 0 6px}table{width:100%;border-collapse:collapse;margin:0 0 10px}th,td{border:1px solid #bbb;padding:4px 6px;vertical-align:top;text-align:left;word-break:break-word}th{background:#f1f1f1;font-weight:600}.sport-row th{background:#e9eef5;font-weight:700}.sport-row .num{width:1%;text-align:center}.sport-medals{float:right;font-weight:600;white-space:nowrap}.total-row th{background:#e7e7e7;font-weight:700}.num{text-align:right;white-space:nowrap}.summary-table th:nth-child(2),.summary-table td:nth-child(2),.summary-table th:nth-child(3),.summary-table td:nth-child(3){text-align:right;white-space:nowrap}.event-table{font-size:8.8px;table-layout:fixed}p{margin:2px 0} .muted{color:#666}</style>'
            .'</head><body>'
            .'<h1>'.__('Tournament Event Report').'</h1>'
            .'<p class="muted"><strong>'.__('Tournament').':</strong> '.$title.'</p>'
            .'<p class="muted"><strong>'.__('Session').':</strong> '.$session.'</p>'
            .'<p class="muted"><strong>'.__('Venue').':</strong> '.e($tournament->venue ?? '—').'</p>'
            .'<p class="muted"><strong>'.__('Date').':</strong> '.e((string) $eventDate).'</p>'
            .'<p class="muted"><strong>'.__('Printed at').':</strong> '.e(now()->format('Y-m-d H:i')).'</p>'
            .'<p class="muted"><strong>'.__('Filters').':</strong> '.$filtersText.'</p>'
            .'<h2>'.__('Summary').'</h2>'
                    .'<table class="summary-table"><thead><tr><th>'.__('Metric').'</th><th>'.__('Value').'</th></tr></thead><tbody>'
                    .$metricRowsHtml
                    .'</tbody></table>'
            .($detailMode
                ? '<h2>'.__('Event-wise medals and participants').'</h2>'
                    .'<p class="muted">'.__('This table shows event-wise medal and participant rows for the active filters.').'</p>'
                    .'<table class="event-table">'.$detailReportColgroup.$detailReportHead.'<tbody>'
                    .$tableBody
                    .$detailTotalsRow
                    .'</tbody></table>'
                : ($medalLogMode
                    ? '<h2>'.__('Medal log').'</h2>'
                        .'<p class="muted">'.__('This table shows event-wise medal counts only.').'</p>'
                        .'<table class="event-table">'.$medalReportColgroup.$medalReportHead.'<tbody>'
                        .$tableBody
                        .$medalTotalsRow
                        .'</tbody></table>'
                    : '<h2>'.__('Sport-wise totals').'</h2>'
                    .'<p class="muted">'.__('This table shows sport-wise totals for the active filters.').'</p>'
                    .'<table class="summary-table"><thead><tr><th>'.__('Sport').'</th><th>'.__('Events').'</th><th>'.__('Participants').'</th></tr></thead><tbody>'
                    .$tableBody
                    .'</tbody></table>'))
            .'<script>window.onload=function(){window.print();}</script>'
        .'</body></html>';
    }

    /**
     * @param  Collection<int, mixed>  $events
     */
    private function sportMedalSummaryHtml(Collection $events): string
    {
        $gold = $events->sum(static fn ($event): int => is_array($event) ? (int) ($event['gold'] ?? 0) : 0);
        $silver = $events->sum(static fn ($event): int => is_array($event) ? (int) ($event['silver'] ?? 0) : 0);
        $bronze = $events->sum(static fn ($event): int => is_array($event) ? (int) ($event['bronze'] ?? 0) : 0);
        $merit = $events->sum(static fn ($event): int => is_array($event) ? (int) ($event['merit'] ?? 0) : 0);

        return sprintf(
            '<span class="sport-medals">%s %d | %s %d | %s %d | %s %d | %s %d</span>',
            e(__('Gold')),
            $gold,
            e(__('Silver')),
            $silver,
            e(__('Bronze')),
            $bronze,
            e(__('Merit')),
            $merit,
            e(__('Total')),
            $gold + $silver + $bronze + $merit,
        );
    }

    /**
     * @param  array<int, array<string, mixed>>  $sports
     * @return Collection<int, array{id: int, name: string, events_count: int, participants_count: int}>
     */
    private function eventReportSportRows(array $sports): Collection
    {
        $grouped = [];

        foreach ($sports as $sport) {
            if (! is_array($sport)) {
                continue;
            }

            $sportId = (int) ($sport['id'] ?? 0);
            $sportName = (string) ($sport['name'] ?? '');
            $nameNormalized = strtolower(trim(preg_replace('/\s+/', ' ', $sportName)));
            $nameNormalized = preg_replace('/[^a-z0-9]+/i', ' ', $nameNormalized) ?? '';
            $sportKey = $sportId > 0 ? "id:{$sportId}" : "name:{$nameNormalized}";

            if (! isset($grouped[$sportKey])) {
                $grouped[$sportKey] = [
                    'id' => $sportId,
                    'name' => $sportName !== '' ? $sportName : __('Unknown sport'),
                    'events_count' => 0,
                    'participants_count' => 0,
                ];
            }

            $grouped[$sportKey]['events_count'] = (int) $grouped[$sportKey]['events_count'] + (int) ($sport['events_count'] ?? 0);
            $grouped[$sportKey]['participants_count'] = (int) $grouped[$sportKey]['participants_count'] + (int) ($sport['participants_count'] ?? 0);
        }

        return collect($grouped)
            ->sort(
                static function (array $left, array $right): int {
                    $byParticipants = (int) $right['participants_count'] <=> (int) $left['participants_count'];
                    if ($byParticipants !== 0) {
                        return $byParticipants;
                    }

                    $byEvents = (int) $right['events_count'] <=> (int) $left['events_count'];
                    if ($byEvents !== 0) {
                        return $byEvents;
                    }

                    return strcmp((string) $left['name'], (string) $right['name']);
                },
            )
            ->values();
    }

    /**
     * @param  Collection<int, array<string, mixed>>  $eventRows
     * @return array<int, array{name: string, count: int, gold: int, silver: int, bronze: int, merit: int}>
     */
    private function eventReportGroupMeta(Collection $eventRows): array
    {
        $groups = [];

        foreach ($eventRows as $event) {
            if (! is_array($event)) {
                continue;
            }

            $sportName = (string) ($event['sport'] ?? __('Unknown sport'));
            $sportId = (int) ($event['sport_id'] ?? 0);
            $key = $sportId > 0
                ? "id:{$sportId}"
                : $this->normalizeSportNameKey($sportName);
            $key = "group:{$key}";

            if (! isset($groups[$key])) {
                $groups[$key] = [
                    'name' => $sportName,
                    'count' => 0,
                    'gold' => 0,
                    'silver' => 0,
                    'bronze' => 0,
                    'merit' => 0,
                ];
            }

            $groups[$key]['count']++;
            $groups[$key]['gold'] += (int) data_get($event, 'gold', 0);
            $groups[$key]['silver'] += (int) data_get($event, 'silver', 0);
            $groups[$key]['bronze'] += (int) data_get($event, 'bronze', 0);
            $groups[$key]['merit'] += (int) data_get($event, 'merit', 0);
        }

        return $groups;
    }

    private function normalizeSportNameKey(string $sportName): string
    {
        $normalized = strtolower(trim(preg_replace('/\s+/', ' ', $sportName)));

        return preg_replace('/[^a-z0-9]+/i', ' ', $normalized) ?? '';
    }

    /**
     * @param  array<string, mixed>  $event
     */
    private function eventMedalCount(array $event, string $type): int
    {
        $type = strtolower(trim($type));

        if (! in_array($type, ['gold', 'silver', 'bronze', 'merit'], true)) {
            return 0;
        }

        $medalsByType = $event['medals_by_type'] ?? [];
        if (is_array($medalsByType)) {
            $value = $medalsByType[$type] ?? $medalsByType[strtoupper($type)] ?? null;
            if ($value !== null) {
                return (int) $value;
            }
        }

        return (int) data_get($event, sprintf('medals_by_type.%s', strtoupper($type)), 0);
    }

    /**
     * @param  Collection<int, array<string, mixed>>  $eventRows
     * @return Collection<string, array<string, mixed>>
     */
    private function groupEventRowsBySport(Collection $eventRows): Collection
    {
        $groups = [];

        foreach ($eventRows as $event) {
            if (! is_array($event)) {
                continue;
            }

            $sportId = (int) ($event['sport_id'] ?? 0);
            $sportName = (string) ($event['sport'] ?? __('Unknown sport'));
            $sportKey = $sportId > 0
                ? "id:{$sportId}"
                : "name:{$this->normalizeSportNameKey($sportName)}";

            if (! isset($groups[$sportKey])) {
                $groups[$sportKey] = [
                    'sport_name' => $sportName !== '' ? $sportName : __('Unknown sport'),
                    'events' => [],
                ];
            }

            $groups[$sportKey]['events'][] = $event;
        }

        return collect($groups);
    }

    /**
     * @param  Collection<int, array<string, mixed>>  $rows
     * @return Collection<int, array<string, mixed>>
     */
    private function eventRowsForDetailExport(Collection $rows): Collection
    {
        $grouped = $this->groupEventRowsBySport($rows);

        $formatted = $grouped->flatMap(function (array $group): array {
            $events = $group['events'] ?? [];
            $index = 0;
            $result = [];

            foreach ($events as $event) {
                if (! is_array($event)) {
                    continue;
                }

                $result[] = [
                    'sport' => $index === 0 ? (string) ($group['sport_name'] ?? __('Unknown sport')) : '',
                    'event' => (string) ($event['title'] ?? ''),
                    'players' => (string) ($event['players'] ?? ''),
                    'gender' => (string) ($event['gender'] ?? ''),
                    'type' => (string) ($event['type'] ?? ''),
                    'participants' => (int) ($event['participants'] ?? 0),
                    'gold' => (int) ($event['gold'] ?? 0),
                    'silver' => (int) ($event['silver'] ?? 0),
                    'bronze' => (int) ($event['bronze'] ?? 0),
                    'merit' => (int) ($event['merit'] ?? 0),
                    'total_medals' => (int) ($event['total_medals'] ?? 0),
                ];

                $index++;
            }

            return $result;
        })->values();

        return $formatted;
    }

    /**
     * @param  Collection<int, array<string, mixed>>  $rows
     * @return Collection<int, array<string, mixed>>
     */
    private function eventRowsForMedalLogExport(Collection $rows): Collection
    {
        return $this->groupEventRowsBySport($rows)
            ->flatMap(function (array $group): array {
                $events = $group['events'] ?? [];
                $index = 0;
                $result = [];

                foreach ($events as $event) {
                    if (! is_array($event)) {
                        continue;
                    }

                    $result[] = [
                        'sport' => $index === 0 ? (string) ($group['sport_name'] ?? __('Unknown sport')) : '',
                        'event' => (string) ($event['title'] ?? ''),
                        'gender' => (string) ($event['gender'] ?? ''),
                        'type' => (string) ($event['type'] ?? ''),
                        'gold' => (int) ($event['gold'] ?? 0),
                        'silver' => (int) ($event['silver'] ?? 0),
                        'bronze' => (int) ($event['bronze'] ?? 0),
                        'merit' => (int) ($event['merit'] ?? 0),
                        'total_medals' => (int) ($event['total_medals'] ?? 0),
                    ];

                    $index++;
                }

                return $result;
            })
            ->values();
    }

    /**
     * @param  Collection<int, array<string, mixed>>  $events
     * @return array<string, mixed>
     */
    private function buildEventSummaryFromRows(Collection $events): array
    {
        $sports = [];
        $summary = [
            'sports' => [],
            'team_events' => 0,
            'individual_events' => 0,
            'team_medals' => 0,
            'individual_medals' => 0,
            'medal_counts' => [
                'GOLD' => 0,
                'SILVER' => 0,
                'BRONZE' => 0,
                'MERIT' => 0,
            ],
            'total_events' => 0,
            'total_participants' => 0,
            'total_medals' => 0,
        ];

        foreach ($events as $event) {
            if (! is_array($event)) {
                continue;
            }

            $sport = is_array($event['sport'] ?? null) ? $event['sport'] : null;
            $sportId = (int) ($sport['id'] ?? 0);
            $sportName = (string) ($sport['name'] ?? __('Unknown sport'));
            $sportNameKey = strtolower(trim($sportName));
            $sportKey = $sportId > 0 ? "id:{$sportId}" : "name:{$sportNameKey}";

            if (! isset($sports[$sportKey])) {
                $sports[$sportKey] = [
                    'id' => $sportId > 0 ? $sportId : 0,
                    'name' => $sportName,
                    'events_count' => 0,
                    'participants_count' => 0,
                ];
            }

            $participants = (int) ($event['participations_count'] ?? 0);
            $gold = $this->eventMedalCount((array) $event, 'gold');
            $silver = $this->eventMedalCount((array) $event, 'silver');
            $bronze = $this->eventMedalCount((array) $event, 'bronze');
            $merit = $this->eventMedalCount((array) $event, 'merit');
            $totalMedals = $gold + $silver + $bronze + $merit;

            $summary['total_participants'] += $participants;
            $summary['total_medals'] += $totalMedals;
            $summary['medal_counts']['GOLD'] += $gold;
            $summary['medal_counts']['SILVER'] += $silver;
            $summary['medal_counts']['BRONZE'] += $bronze;
            $summary['medal_counts']['MERIT'] += $merit;
            $sports[$sportKey]['events_count'] = (int) $sports[$sportKey]['events_count'] + 1;
            $sports[$sportKey]['participants_count'] = (int) $sports[$sportKey]['participants_count'] + $participants;

            if (($event['event_type'] ?? '') === 'team') {
                $summary['team_events'] += 1;
                $summary['team_medals'] += $totalMedals;
            } else {
                $summary['individual_events'] += 1;
                $summary['individual_medals'] += $totalMedals;
            }
        }

        $summary['total_events'] = (int) $events->count();
        $summary['sports'] = collect($sports)
            ->sort(
                static function (array $left, array $right): int {
                    $byParticipants = (int) $right['participants_count'] <=> (int) $left['participants_count'];
                    if ($byParticipants !== 0) {
                        return $byParticipants;
                    }

                    $byEvents = (int) $right['events_count'] <=> (int) $left['events_count'];
                    if ($byEvents !== 0) {
                        return $byEvents;
                    }

                    return strcmp((string) $left['name'], (string) $right['name']);
                },
            )
            ->values()
            ->all();

        return $summary;
    }

    /**
     * @param  array<string, mixed>  $summary
     * @param  Collection<int, array<string, mixed>>  $events
     * @return array<string, mixed>
     */
    private function hydrateSummaryTotals(array $summary, Collection $events): array
    {
        if (! isset($summary['medal_counts']) || ! is_array($summary['medal_counts'])) {
            $summary['medal_counts'] = [
                'GOLD' => 0,
                'SILVER' => 0,
                'BRONZE' => 0,
                'MERIT' => 0,
            ];
        }

        if (! isset($summary['sports']) || ! is_array($summary['sports'])) {
            $summary['sports'] = [];
        }

        if (! isset($summary['team_events'])) {
            $summary['team_events'] = 0;
        }

        if (! isset($summary['individual_events'])) {
            $summary['individual_events'] = 0;
        }

        if (! isset($summary['team_medals'])) {
            $summary['team_medals'] = 0;
        }

        if (! isset($summary['individual_medals'])) {
            $summary['individual_medals'] = 0;
        }

        $summary['total_events'] = (int) ($summary['total_events'] ?? $events->count());
        $summary['total_participants'] = (int) ($summary['total_participants'] ?? 0);
        $summary['total_medals'] = (int) ($summary['total_medals'] ?? 0);

        if ($summary['total_participants'] !== 0 || $summary['total_medals'] !== 0) {
            return $summary;
        }

        foreach ($events as $event) {
            if (! is_array($event)) {
                continue;
            }

            $participants = (int) ($event['participations_count'] ?? 0);
            $gold = $this->eventMedalCount((array) $event, 'gold');
            $silver = $this->eventMedalCount((array) $event, 'silver');
            $bronze = $this->eventMedalCount((array) $event, 'bronze');
            $merit = $this->eventMedalCount((array) $event, 'merit');
            $totalMedals = $gold + $silver + $bronze + $merit;

            $summary['total_participants'] += $participants;
            $summary['total_medals'] += $totalMedals;

            $summary['medal_counts']['GOLD'] = (int) $summary['medal_counts']['GOLD'] + $gold;
            $summary['medal_counts']['SILVER'] = (int) $summary['medal_counts']['SILVER'] + $silver;
            $summary['medal_counts']['BRONZE'] = (int) $summary['medal_counts']['BRONZE'] + $bronze;
            $summary['medal_counts']['MERIT'] = (int) $summary['medal_counts']['MERIT'] + $merit;

            if (($event['event_type'] ?? '') === 'team') {
                $summary['team_events'] = (int) $summary['team_events'] + 1;
                $summary['team_medals'] = (int) $summary['team_medals'] + $totalMedals;

                continue;
            }

            $summary['individual_events'] = (int) $summary['individual_events'] + 1;
            $summary['individual_medals'] = (int) $summary['individual_medals'] + $totalMedals;
        }

        return $summary;
    }

    /**
     * @param  array<string, mixed>  $summary
     * @return array<int, array{0: string, 1: string}>
     */
    private function eventReportSummaryRows(array $summary): array
    {
        return [
            [__('Events'), (string) ((int) ($summary['total_events'] ?? 0))],
            [__('Sports'), (string) count($summary['sports'] ?? [])],
            [__('Medals'), (string) (
                (int) ($summary['medal_counts']['GOLD'] ?? 0) +
                (int) ($summary['medal_counts']['SILVER'] ?? 0) +
                (int) ($summary['medal_counts']['BRONZE'] ?? 0) +
                (int) ($summary['medal_counts']['MERIT'] ?? 0)
            )],
            [__('Individual medals'), (string) ((int) ($summary['individual_medals'] ?? 0))],
            [__('Team medals'), (string) ((int) ($summary['team_medals'] ?? 0))],
            [__('Individual events'), (string) ((int) ($summary['individual_events'] ?? 0))],
            [__('Team events'), (string) ((int) ($summary['team_events'] ?? 0))],
            [__('Participants'), (string) ((int) ($summary['total_participants'] ?? 0))],
        ];
    }

    /**
     * @param  array<string, string|null>  $filters
     * @return array<string, string|int|null>
     */
    private function eventFilters(Request $request): array
    {
        $raw = $request->query('filter', []);
        $filters = is_array($raw) ? $raw : [];
        $eventFilters = is_array($filters) ? $filters : [];

        /** @var array<string, string|int|null> $clean */
        $clean = [
            'q' => null,
            'sport_id' => null,
            'gender' => null,
            'participation_status' => null,
            'event_type' => null,
            'report_type' => self::EVENT_REPORT_TYPE_DETAIL,
        ];

        if (is_string($eventFilters['q'] ?? null)) {
            $q = trim($eventFilters['q']);
            $clean['q'] = $q === '' ? null : $q;
        }

        if (is_string($eventFilters['sport_id'] ?? null) || is_int($eventFilters['sport_id'] ?? null)) {
            $clean['sport_id'] = (string) $eventFilters['sport_id'];
        }

        if (is_string($eventFilters['gender'] ?? null) || is_int($eventFilters['gender'] ?? null)) {
            $clean['gender'] = (string) $eventFilters['gender'];
        }

        if (is_string($eventFilters['participation_status'] ?? null)) {
            $clean['participation_status'] = (string) $eventFilters['participation_status'];
        }

        if (is_string($eventFilters['event_type'] ?? null)) {
            $clean['event_type'] = (string) $eventFilters['event_type'];
        }

        if (is_string($eventFilters['report_type'] ?? null)) {
            $clean['report_type'] = $this->resolveEventReportType($eventFilters['report_type']);
        }

        return $clean;
    }

    private function resolveEventReportType(?string $type): string
    {
        return match ($type) {
            self::EVENT_REPORT_TYPE_SUMMARY => self::EVENT_REPORT_TYPE_SUMMARY,
            self::EVENT_REPORT_TYPE_MEDAL_LOG => self::EVENT_REPORT_TYPE_MEDAL_LOG,
            default => self::EVENT_REPORT_TYPE_DETAIL,
        };
    }

    /**
     * @return array<int, array<int, string>>
     */
    private function buildEventsReportMetaRows(
        Tournament $tournament,
        array $filters,
        array $summary,
        string $reportType,
    ): array {
        $filterParts = [];
        foreach ($filters as $key => $value) {
            if (
                $value === null
                || (string) $value === ''
                || ($key === 'report_type' && (string) $value === self::EVENT_REPORT_TYPE_DETAIL)
            ) {
                continue;
            }

            $filterParts[] = sprintf('%s=%s', (string) $key, (string) $value);
        }

        $dateText = match (true) {
            $tournament->date_from === null => '—',
            $tournament->date_to === null || $tournament->date_from === $tournament->date_to => $tournament->date_from->toDateString(),
            default => $tournament->date_from->toDateString().' - '.$tournament->date_to->toDateString(),
        };

        return [
            [__('Tournament'), (string) $tournament->name],
            [__('Session'), (string) ($tournament->session?->name ?? '—')],
            [__('Venue'), (string) ($tournament->venue ?? '—')],
            [__('Date range'), (string) $dateText],
            [__('Printed at'), now()->format('Y-m-d H:i')],
            [__('Filters'), empty($filterParts) ? __('None') : implode(', ', $filterParts)],
            ['', ''],
            ...$this->eventReportSummaryRows($summary),
        ];
    }

    /**
     * @return array<string, mixed>
     */
    private function aggregateSelects(): array
    {
        return [
            'participants_count' => Participation::query()
                ->selectRaw('count(*)')
                ->join('events', 'events.id', '=', 'participations.event_id')
                ->whereColumn('events.tournament_id', 'tournaments.id'),
            'teams_count' => Participation::query()
                ->selectRaw('count(distinct participations.team_id)')
                ->join('events', 'events.id', '=', 'participations.event_id')
                ->whereColumn('events.tournament_id', 'tournaments.id')
                ->whereNotNull('participations.team_id'),
            'medals_count' => Achievement::query()
                ->selectRaw('count(*)')
                ->join('participations', 'participations.id', '=', 'achievements.participation_id')
                ->join('events', 'events.id', '=', 'participations.event_id')
                ->whereColumn('events.tournament_id', 'tournaments.id'),
        ];
    }
}
