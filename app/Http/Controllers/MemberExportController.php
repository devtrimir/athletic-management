<?php

declare(strict_types=1);

namespace App\Http\Controllers;

use App\Exports\ReportExport;
use App\Models\Member;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Gate;
use Maatwebsite\Excel\Facades\Excel;
use Spatie\QueryBuilder\AllowedFilter;
use Spatie\QueryBuilder\QueryBuilder;
use Symfony\Component\HttpFoundation\BinaryFileResponse;

class MemberExportController extends Controller
{
    /** @var array<string, string> */
    private const COLUMN_LABELS = [
        'member_code' => 'Member Code',
        'pno' => 'PNO',
        'full_name_hi' => 'Name (Hindi)',
        'full_name_en' => 'Name (English)',
        'father_name_hi' => "Father's Name",
        'gender' => 'Gender',
        'dob' => 'Date of Birth',
        'rank' => 'Rank',
        'mobile' => 'Mobile',
        'current_status' => 'Status',
        'player_category' => 'Category',
        'player_level' => 'Level',
        'unit' => 'Unit',
        'home_district' => 'Home District',
        'joining_date' => 'Joining Date',
        'blood_group' => 'Blood Group',
        'caste' => 'Caste',
        'recruitment_type' => 'Recruitment Type',
        'appointment' => 'Appointment',
        'sport_event' => 'Sport Event',
        'promotion_date' => 'Promotion Date',
        'team_since' => 'Team Since',
    ];

    public function index(Request $request): BinaryFileResponse
    {
        Gate::authorize('viewAny', Member::class);

        /** @var array<int, string> $columns */
        $columns = $request->query('columns', array_keys(self::COLUMN_LABELS));

        /** @var array<int, string> $ids */
        $ids = $request->query('ids', []);

        $baseQuery = Member::query();

        if (! empty($ids)) {
            $baseQuery->whereIn('id', array_map('intval', $ids));
            $members = $baseQuery
                ->with(['currentUnit:id,name_hi', 'homeDistrict:id,name_hi'])
                ->orderBy('full_name_hi')
                ->get();
        } else {
            $members = QueryBuilder::for($baseQuery)
            ->allowedFilters([
                AllowedFilter::exact('player_category'),
                AllowedFilter::exact('player_level'),
                AllowedFilter::exact('current_status'),
                AllowedFilter::exact('home_district_id'),
                AllowedFilter::exact('current_unit_id'),
                AllowedFilter::exact('gender'),
                AllowedFilter::exact('blood_group'),
                AllowedFilter::exact('recruitment_type'),
                AllowedFilter::callback('q', function ($query, string $value): void {
                    $query->where(function ($q) use ($value): void {
                        $q->where('full_name_hi', 'LIKE', "%{$value}%")
                            ->orWhere('pno', 'LIKE', "%{$value}%");
                    });
                }),
                AllowedFilter::callback('joining_year_from', function ($query, string $value): void {
                    $query->whereYear('joining_date', '>=', (int) $value);
                }),
                AllowedFilter::callback('joining_year_to', function ($query, string $value): void {
                    $query->whereYear('joining_date', '<=', (int) $value);
                }),
            ])
            ->allowedSorts(['full_name_hi', 'pno', 'joining_date', 'created_at'])
                ->defaultSort('full_name_hi')
                ->with(['currentUnit:id,name_hi', 'homeDistrict:id,name_hi'])
                ->get();
        }

        $validColumns = array_intersect($columns, array_keys(self::COLUMN_LABELS));
        $headings = array_map(fn (string $col) => self::COLUMN_LABELS[$col], $validColumns);

        $rows = $members->map(function (Member $member) use ($validColumns) {
            $row = [];
            foreach ($validColumns as $col) {
                $row[$col] = match ($col) {
                    'unit' => $member->currentUnit?->name_hi,
                    'home_district' => $member->homeDistrict?->name_hi,
                    'dob', 'joining_date', 'promotion_date', 'team_since' => $member->{$col}?->toDateString(),
                    default => $member->{$col},
                };
            }

            return $row;
        });

        return Excel::download(
            new ReportExport($rows, array_values($headings), 'Members'),
            'members-'.now()->format('Y-m-d').'.xlsx',
        );
    }

    public function show(Member $member, Request $request): BinaryFileResponse
    {
        Gate::authorize('view', $member);

        $member->load(['currentUnit:id,name_hi', 'homeDistrict:id,name_hi']);

        /** @var array<int, string> $columns */
        $columns = $request->query('columns', array_keys(self::COLUMN_LABELS));
        $validColumns = array_intersect($columns, array_keys(self::COLUMN_LABELS));
        $headings = array_map(fn (string $col) => self::COLUMN_LABELS[$col], $validColumns);

        $rows = collect([[]])->map(function () use ($member, $validColumns) {
            $row = [];
            foreach ($validColumns as $col) {
                $row[$col] = match ($col) {
                    'unit' => $member->currentUnit?->name_hi,
                    'home_district' => $member->homeDistrict?->name_hi,
                    'dob', 'joining_date', 'promotion_date', 'team_since' => $member->{$col}?->toDateString(),
                    default => $member->{$col},
                };
            }

            return $row;
        });

        $filename = 'member-'.$member->member_code.'-'.now()->format('Y-m-d').'.xlsx';

        return Excel::download(
            new ReportExport($rows, array_values($headings), $member->full_name_hi),
            $filename,
        );
    }
}
