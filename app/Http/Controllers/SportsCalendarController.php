<?php

declare(strict_types=1);

namespace App\Http\Controllers;

use App\Http\Requests\SportsCalendars\StoreSportsCalendarRequest;
use App\Http\Requests\SportsCalendars\UpdateSportsCalendarRequest;
use App\Models\SportsCalendar;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Gate;
use Illuminate\Support\Facades\Storage;
use Inertia\Inertia;
use Inertia\Response;
use Symfony\Component\HttpFoundation\BinaryFileResponse;
use Symfony\Component\HttpFoundation\ResponseHeaderBag;
use Symfony\Component\HttpFoundation\StreamedResponse;

class SportsCalendarController extends Controller
{
    public function index(Request $request): Response
    {
        Gate::authorize('viewAny', SportsCalendar::class);

        $filters = $request->query('filter', []);
        $filters = is_array($filters) ? $filters : [];

        $search = $this->filterString($filters['q'] ?? null);
        $year = $this->filterInteger($filters['year'] ?? null);
        $reportFilter = $this->filterReportStatus($filters['report_arrived'] ?? null);

        $calendars = SportsCalendar::query()
            ->when($search !== null, function ($query) use ($search): void {
                $like = '%'.mb_strtolower($search).'%';

                $query->where(function ($searchQuery) use ($like): void {
                    $searchQuery
                        ->whereRaw('LOWER(competition_name) LIKE ?', [$like])
                        ->orWhereRaw('LOWER(proposed_month) LIKE ?', [$like])
                        ->orWhereRaw('LOWER(proposed_month_annual) LIKE ?', [$like])
                        ->orWhereRaw('LOWER(proposed_venue) LIKE ?', [$like])
                        ->orWhereRaw("CAST(year AS CHAR) LIKE ?", [$like]);
                });
            })
            ->when($year !== null, fn ($query) => $query->where('year', $year))
            ->when($reportFilter !== null, fn ($query) => $query->where('report_arrived', $reportFilter))
            ->orderByDesc('year')
            ->orderBy('competition_name')
            ->paginate(25)
            ->withQueryString();

        return Inertia::render('sports-calendars/index', [
            'calendars' => $calendars,
            'filters' => [
                'q' => $search,
                'year' => $year === null ? null : (string) $year,
                'report_arrived' => $this->filterValueForView($reportFilter),
            ],
            'yearOptions' => $this->yearOptions(),
        ]);
    }

    public function create(): Response
    {
        Gate::authorize('create', SportsCalendar::class);

        return Inertia::render('sports-calendars/create', [
            'years' => $this->yearOptions(),
        ]);
    }

    public function store(StoreSportsCalendarRequest $request): RedirectResponse
    {
        Gate::authorize('create', SportsCalendar::class);
        $isReportArrived = $request->boolean('report_arrived');
        $reportPayload = $isReportArrived
            ? $this->reportPdfPayload($request, (int) $request->user()->organization_id)
            : [];

        SportsCalendar::create([
            ...$request->safe()->except('report_pdf'),
            ...($isReportArrived ? $reportPayload : []),
            'organization_id' => (int) $request->user()->organization_id,
            'created_by' => $request->user()->id,
            'updated_by' => $request->user()->id,
        ]);

        Inertia::flash('toast', ['type' => 'success', 'message' => __('Sports calendar entry created.')]);

        return to_route('sports-calendars.index');
    }

    public function edit(SportsCalendar $sportsCalendar): Response
    {
        Gate::authorize('update', $sportsCalendar);

        return Inertia::render('sports-calendars/edit', [
            'calendar' => $this->calendarPayload($sportsCalendar),
            'years' => $this->yearOptions(),
        ]);
    }

    public function update(
        UpdateSportsCalendarRequest $request,
        SportsCalendar $sportsCalendar,
    ): RedirectResponse {
        Gate::authorize('update', $sportsCalendar);

        $isReportArrived = $request->boolean('report_arrived');
        $reportPayload = $this->reportPdfPayload($request, (int) $request->user()->organization_id);
        $oldReportPath = $sportsCalendar->report_pdf_path;
        $hadStoredReport = $sportsCalendar->report_pdf_path !== null;

        $sportsCalendar->update([
            ...$request->safe()->except('report_pdf'),
            ...($isReportArrived
                ? $reportPayload
                : [
                    'report_pdf_path' => null,
                    'report_pdf_original_name' => null,
                    'report_pdf_mime_type' => null,
                    'report_pdf_size_bytes' => null,
                ]),
            'updated_by' => $request->user()->id,
        ]);

        if ($isReportArrived && $reportPayload !== []) {
            if ($oldReportPath !== null) {
                $this->deleteReportPdf($oldReportPath);
            }
        } elseif (! $isReportArrived && $hadStoredReport) {
            $this->deleteReportPdf($oldReportPath);
        }

        Inertia::flash('toast', ['type' => 'success', 'message' => __('Sports calendar entry updated.')]);

        return to_route('sports-calendars.edit', $sportsCalendar);
    }

    public function report(SportsCalendar $sportsCalendar): StreamedResponse
    {
        Gate::authorize('view', $sportsCalendar);
        $this->ensureReportAvailable($sportsCalendar);

        return Storage::disk('local')->download(
            $sportsCalendar->report_pdf_path,
            $sportsCalendar->report_pdf_original_name,
        );
    }

    public function previewReport(SportsCalendar $sportsCalendar): BinaryFileResponse
    {
        Gate::authorize('view', $sportsCalendar);
        $this->ensureReportAvailable($sportsCalendar);

        $response = response()->file(
            Storage::disk('local')->path($sportsCalendar->report_pdf_path),
            array_filter([
                'Content-Type' => $sportsCalendar->report_pdf_mime_type,
            ]),
        );

        $response->setContentDisposition(
            ResponseHeaderBag::DISPOSITION_INLINE,
            $sportsCalendar->report_pdf_original_name ?? 'sports-calendar-report',
        );

        return $response;
    }

    /**
     * @return array<string, mixed>
     */
    private function reportPdfPayload(StoreSportsCalendarRequest|UpdateSportsCalendarRequest $request, int $organizationId): array
    {
        $file = $request->file('report_pdf');

        if ($file === null) {
            return [];
        }

        $path = $file->store("sports-calendars/organization-{$organizationId}", 'local');

        return [
            'report_pdf_path' => $path,
            'report_pdf_original_name' => $file->getClientOriginalName(),
            'report_pdf_mime_type' => $file->getMimeType(),
            'report_pdf_size_bytes' => $file->getSize(),
        ];
    }

    private function deleteReportPdf(?string $path): void
    {
        if ($path === null || $path === '') {
            return;
        }

        Storage::disk('local')->delete($path);
        Storage::disk('public')->delete($path);
    }

    /**
     * @return array<string, string|bool|int|null>
     */
    private function calendarPayload(SportsCalendar $sportsCalendar): array
    {
        return [
            ...$sportsCalendar->toArray(),
            'report_pdf' => $sportsCalendar->report_pdf_path === null ? null : [
                'name' => $sportsCalendar->report_pdf_original_name,
                'original_name' => $sportsCalendar->report_pdf_original_name,
                'mime_type' => $sportsCalendar->report_pdf_mime_type,
                'size_bytes' => $sportsCalendar->report_pdf_size_bytes,
                'preview_url' => route('sports-calendars.report.preview', $sportsCalendar),
                'download_url' => route('sports-calendars.report', $sportsCalendar),
            ],
        ];
    }

    private function yearOptions(): array
    {
        $currentYear = (int) now()->year;
        $recentYears = array_map(
            static fn (int $year): string => (string) $year,
            range(max(2020, $currentYear - 4), $currentYear + 2),
        );
        $recordedYears = SportsCalendar::query()
            ->select('year')
            ->distinct()
            ->orderBy('year')
            ->pluck('year')
            ->map(static fn (string|int $year): string => (string) $year)
            ->all();

        return array_values(array_unique(array_merge($recentYears, $recordedYears)));
    }

    private function filterString(mixed $value): ?string
    {
        if (! is_string($value)) {
            return null;
        }

        $value = trim($value);

        return $value === '' ? null : $value;
    }

    private function filterInteger(mixed $value): ?int
    {
        if (! is_string($value) && ! is_int($value)) {
            return null;
        }

        $year = (int) $value;

        if ((string) $year !== trim((string) $value) || $year < 2000 || $year > 2400) {
            return null;
        }

        return $year;
    }

    private function filterReportStatus(mixed $value): ?bool
    {
        if (! is_string($value)) {
            return null;
        }

        return match (mb_strtolower(trim($value))) {
            'arrived', '1', 'true', 'yes' => true,
            'missing', '0', 'false', 'no' => false,
            default => null,
        };
    }

    private function filterValueForView(?bool $value): ?string
    {
        return match ($value) {
            true => 'arrived',
            false => 'missing',
            default => null,
        };
    }

    private function ensureReportAvailable(SportsCalendar $sportsCalendar): void
    {
        abort_if($sportsCalendar->report_pdf_path === null, 404);
        abort_unless(Storage::disk('local')->exists($sportsCalendar->report_pdf_path), 404);
    }
}
