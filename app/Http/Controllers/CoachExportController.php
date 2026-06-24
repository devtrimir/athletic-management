<?php

declare(strict_types=1);

namespace App\Http\Controllers;

use App\Exports\ReportExport;
use App\Models\Coach;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Gate;
use Maatwebsite\Excel\Facades\Excel;
use Spatie\QueryBuilder\AllowedFilter;
use Spatie\QueryBuilder\QueryBuilder;
use Symfony\Component\HttpFoundation\BinaryFileResponse;

class CoachExportController extends Controller
{
    /** @var array<int, string> */
    private const DEFAULT_COLUMNS = [
        'serial_number',
        'full_name',
        'pno',
        'blood_group',
        'gender',
        'sports',
        'unit_district',
        'mobile',
        'nis_certified',
    ];

    /** @var array<string, string> */
    private const COLUMN_LABELS = [
        'serial_number' => 'S.No.',
        'full_name' => 'Name',
        'pno' => 'PNO',
        'blood_group' => 'Blood Group',
        'gender' => 'Gender',
        'sports' => 'Playable Sport',
        'unit_district' => 'Unit / District',
        'mobile' => 'Mobile Number',
        'nis_certified' => 'NIS Certified',
        'display_name' => 'Display Name',
        'designation' => 'Designation',
        'email' => 'Email',
        'coach_status' => 'Status',
        'certifications' => 'Certifications',
        'assignment_history_count' => 'Assignment History Count',
        'linked_member' => 'Linked Member Code',
    ];

    public function index(Request $request): BinaryFileResponse
    {
        Gate::authorize('viewAny', Coach::class);

        /** @var array<int, string> $columns */
        $columns = $request->query('columns', self::DEFAULT_COLUMNS);

        /** @var array<int, string> $ids */
        $ids = $request->query('ids', []);

        if (! empty($ids)) {
            $coaches = Coach::whereIn('id', array_map('intval', $ids))
                ->with([
                    'district:id,name',
                    'unit:id,name',
                    'member:id,member_code',
                    'sports:id,name',
                    'certifications:id,coach_id,name,certificate_type',
                    'assignmentHistory:id,coach_id',
                ])
                ->orderBy('full_name')
                ->get();
        } else {
            $coaches = QueryBuilder::for(Coach::class)
                ->allowedFilters([
                    AllowedFilter::callback('status_scope', fn (Builder $query, mixed $value): Builder => $this->filterByStatusScope($query, (string) $value)),
                    AllowedFilter::exact('nis_certified'),
                    AllowedFilter::exact('blood_group'),
                    AllowedFilter::exact('district_id'),
                    AllowedFilter::exact('unit_id'),
                    AllowedFilter::exact('nis_master_id'),
                    AllowedFilter::exact('tier_master_id'),
                    AllowedFilter::exact('rank_master_id'),
                    AllowedFilter::exact('designation_master_id'),
                    AllowedFilter::exact('coach_status'),
                    AllowedFilter::partial('designation', 'designation'),
                    AllowedFilter::partial('email', 'email'),
                    AllowedFilter::exact('gender'),
                    AllowedFilter::callback('has_certification', function ($query, $value): void {
                        $query->when(
                            $value === 'true' || $value === true,
                            fn ($q) => $q->whereHas('certifications'),
                            fn ($q) => $q->whereDoesntHave('certifications')
                        );
                    }),
                    AllowedFilter::callback('certification_name', function ($query, $value): void {
                        if ($value === null || $value === '') {
                            return;
                        }

                        $term = '%'.mb_strtolower((string) $value).'%';
                        $query->whereHas('certifications', fn ($q) => $q->whereRaw('LOWER(name) LIKE ?', [$term]));
                    }),
                    AllowedFilter::callback('certification_type', function ($query, $value): void {
                        if ($value === null || $value === '') {
                            return;
                        }

                        $query->whereHas('certifications', fn ($q) => $q->where('certificate_type', (string) $value));
                    }),
                    AllowedFilter::callback('sport_id', function ($query, $value): void {
                        if ($value === null || $value === '') {
                            return;
                        }

                        $query->whereHas('sports', fn ($q) => $q->where('sports.id', (int) $value));
                    }),
                    AllowedFilter::callback('has_active_assignment', function ($query, $value): void {
                        if ($value === 'true' || $value === true) {
                            $query->whereHas('currentAssignments');
                        } elseif ($value === 'false' || $value === false) {
                            $query->whereDoesntHave('currentAssignments');
                        }
                    }),
                    AllowedFilter::callback('assignment_role', function ($query, $value): void {
                        if ($value === null || $value === '') {
                            return;
                        }

                        $query->whereHas('currentAssignments', fn ($q) => $q->where('role', (string) $value));
                    }),
                    AllowedFilter::callback('has_member', function ($query, $value): void {
                        if ($value === 'true' || $value === true) {
                            $query->whereNotNull('member_id');
                        } else {
                            $query->whereNull('member_id');
                        }
                    }),
                    AllowedFilter::partial('q', 'full_name'),
                ])
                ->allowedSorts(['full_name', 'pno', 'created_at'])
                ->defaultSort('full_name')
                ->with([
                    'member:id,member_code',
                    'district:id,name',
                    'unit:id,name',
                    'certifications:id,coach_id,name,certificate_type',
                    'sports:id,name',
                    'assignmentHistory:id,coach_id',
                ])
                ->get();
        }

        $validColumns = array_intersect($columns, array_keys(self::COLUMN_LABELS));
        $headings = array_map(fn (string $col) => self::COLUMN_LABELS[$col], $validColumns);

        $rows = $coaches->map(function (Coach $coach, int $index) use ($validColumns) {
            $row = [];
            foreach ($validColumns as $col) {
                $row[$col] = match ($col) {
                    'serial_number' => $index + 1,
                    'nis_certified' => $coach->nis_certified ? 'Yes' : 'No',
                    'unit_district' => $coach->unit?->name ?? $coach->district?->name,
                    'linked_member' => $coach->member?->member_code,
                    'certifications' => $coach->certifications
                        ->map(fn ($cert) => trim(($cert->name ?? '').' '.($cert->certificate_type ? "({$cert->certificate_type})" : '')))
                        ->filter()
                        ->join('|'),
                    'sports' => $coach->sports
                        ->map(fn ($sport) => $sport->name)
                        ->filter()
                        ->join('|'),
                    'assignment_history_count' => $coach->assignmentHistory->count(),
                    default => $coach->{$col},
                };
            }

            return $row;
        });

        return Excel::download(
            new ReportExport($rows, array_values($headings), 'Coaches'),
            'coaches-'.now()->format('Y-m-d').'.xlsx',
        );
    }

    public function show(Coach $coach, Request $request): BinaryFileResponse
    {
        Gate::authorize('view', $coach);

        $coach->load([
            'member:id,member_code',
            'district:id,name',
            'unit:id,name',
            'certifications:id,coach_id,name,certificate_type',
            'sports:id,name',
            'assignmentHistory:id,coach_id',
        ]);

        /** @var array<int, string> $columns */
        $columns = $request->query('columns', self::DEFAULT_COLUMNS);
        $validColumns = array_intersect($columns, array_keys(self::COLUMN_LABELS));
        $headings = array_map(fn (string $col) => self::COLUMN_LABELS[$col], $validColumns);

        $rows = collect([[]])->map(function () use ($coach, $validColumns) {
            $row = [];
            foreach ($validColumns as $col) {
                $row[$col] = match ($col) {
                    'serial_number' => 1,
                    'nis_certified' => $coach->nis_certified ? 'Yes' : 'No',
                    'unit_district' => $coach->unit?->name ?? $coach->district?->name,
                    'linked_member' => $coach->member?->member_code,
                    'certifications' => $coach->certifications
                        ->map(fn ($cert) => trim(($cert->name ?? '').' '.($cert->certificate_type ? "({$cert->certificate_type})" : '')))
                        ->filter()
                        ->join('|'),
                    'sports' => $coach->sports
                        ->map(fn ($sport) => $sport->name)
                        ->filter()
                        ->join('|'),
                    'assignment_history_count' => $coach->assignmentHistory->count(),
                    default => $coach->{$col},
                };
            }

            return $row;
        });

        $filename = 'coach-'.($coach->pno ?? $coach->id).'-'.now()->format('Y-m-d').'.xlsx';

        return Excel::download(
            new ReportExport($rows, array_values($headings), $coach->full_name),
            $filename,
        );
    }

    private function filterByStatusScope(Builder $query, string $value): Builder
    {
        return match ($value) {
            'inactive' => $query->whereDoesntHave('activeCurrentSessionAssignments'),
            default => $query->whereHas('activeCurrentSessionAssignments'),
        };
    }
}
