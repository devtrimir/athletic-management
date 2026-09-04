<?php

declare(strict_types=1);

namespace App\Support\Reports;

use Illuminate\Support\Collection;
use Illuminate\Support\Facades\DB;

class MedalMemberScope
{
    /**
     * @param  array<string, mixed>  $filters
     * @return array<string, mixed>
     */
    public static function withoutMemberScopedFilters(array $filters): array
    {
        foreach (self::memberScopedKeys() as $key) {
            unset($filters[$key]);
        }

        return $filters;
    }

    /**
     * @param  array<string, mixed>  $filters
     */
    public static function hasMemberScopedFilters(array $filters): bool
    {
        foreach (self::memberScopedKeys() as $key) {
            $value = $filters[$key] ?? null;

            if (is_array($value) ? $value !== [] : $value !== null && $value !== '') {
                return true;
            }
        }

        return false;
    }

    public static function rowMatches(object $row, Collection $lineupMembers, array $filters): bool
    {
        if (! self::hasMemberScopedFilters($filters)) {
            return true;
        }

        foreach (self::membersForRow($row, $lineupMembers) as $member) {
            if (self::memberMatchesFilters($member, $filters)) {
                return true;
            }
        }

        return false;
    }

    public static function matchingLineupCount(object $row, Collection $lineupMembers, array $filters): int
    {
        $members = self::membersForRow($row, $lineupMembers);

        if (! self::hasMemberScopedFilters($filters)) {
            return count($members);
        }

        return collect($members)
            ->filter(fn (array $member): bool => self::memberMatchesFilters($member, $filters))
            ->count();
    }

    public static function lineupMembers(Collection $rows): Collection
    {
        $memberIds = $rows
            ->flatMap(function (object $row): array {
                $memberId = property_exists($row, 'member_id') ? $row->member_id : ($row->id ?? null);

                return $memberId === null ? self::lineupMemberIds($row->lineup_member_ids ?? null) : [];
            })
            ->unique()
            ->values();

        if ($memberIds->isEmpty()) {
            return collect();
        }

        return DB::table('members as m')
            ->leftJoin('units as u', 'u.id', '=', 'm.current_unit_id')
            ->whereIn('m.id', $memberIds)
            ->whereNull('m.deleted_at')
            ->get([
                'm.id',
                'm.member_code',
                'm.pno',
                'm.full_name',
                'm.rank',
                'm.gender',
                'm.player_category',
                'm.player_level',
                'm.current_status',
                'm.current_unit_id',
                'm.posting_district_id',
                'u.name as unit_name',
            ])
            ->keyBy('id');
    }

    /**
     * @return list<int>
     */
    public static function lineupMemberIds(mixed $lineupMemberIds): array
    {
        $decoded = is_string($lineupMemberIds) ? json_decode($lineupMemberIds, true) : $lineupMemberIds;

        return is_array($decoded)
            ? array_values(array_unique(array_filter(array_map('intval', $decoded))))
            : [];
    }

    /**
     * @return list<array<string, mixed>>
     */
    private static function membersForRow(object $row, Collection $lineupMembers): array
    {
        $memberId = property_exists($row, 'member_id') ? $row->member_id : ($row->id ?? null);

        if ($memberId !== null) {
            return [[
                'id' => (int) $memberId,
                'full_name' => $row->full_name ?? null,
                'pno' => $row->pno ?? null,
                'rank' => $row->rank ?? null,
                'gender' => $row->gender ?? null,
                'player_category' => $row->player_category ?? null,
                'player_level' => $row->player_level ?? null,
                'current_status' => $row->current_status ?? null,
                'current_unit_id' => $row->current_unit_id ?? null,
                'posting_district_id' => $row->posting_district_id ?? null,
            ]];
        }

        return collect(self::lineupMemberIds($row->lineup_member_ids ?? null))
            ->map(fn (int $lineupMemberId): ?object => $lineupMembers->get($lineupMemberId))
            ->filter()
            ->map(fn (object $member): array => [
                'id' => (int) $member->id,
                'full_name' => $member->full_name,
                'pno' => $member->pno,
                'rank' => $member->rank,
                'gender' => $member->gender,
                'player_category' => $member->player_category,
                'player_level' => $member->player_level,
                'current_status' => $member->current_status,
                'current_unit_id' => $member->current_unit_id,
                'posting_district_id' => $member->posting_district_id,
            ])
            ->values()
            ->all();
    }

    /**
     * @param  array<string, mixed>  $member
     * @param  array<string, mixed>  $filters
     */
    public static function memberMatchesFilters(array $member, array $filters): bool
    {
        return self::matchesIds($member['id'] ?? null, $filters['member_ids'] ?? [])
            && self::matchesIds($member['current_unit_id'] ?? null, $filters['unit_ids'] ?? self::legacyId($filters, 'unit_id'))
            && self::matchesIds($member['posting_district_id'] ?? null, $filters['district_ids'] ?? [])
            && self::matchesValues($member['rank'] ?? null, $filters['rank_codes'] ?? [])
            && self::matchesValues($member['player_category'] ?? null, $filters['player_categories'] ?? [])
            && self::matchesValues($member['player_level'] ?? null, $filters['player_levels'] ?? [])
            && self::matchesValues($member['current_status'] ?? null, $filters['statuses'] ?? [])
            && self::matchesValues($member['gender'] ?? null, $filters['genders'] ?? self::legacyValue($filters, 'gender'))
            && self::containsAny([(string) ($member['full_name'] ?? ''), (string) ($member['pno'] ?? '')], $filters['member_name'] ?? null)
            && self::contains((string) ($member['pno'] ?? ''), $filters['pno'] ?? null);
    }

    private static function matchesIds(mixed $value, mixed $ids): bool
    {
        $ids = is_array($ids) ? array_filter(array_map('intval', $ids)) : [];

        return $ids === [] || in_array((int) $value, $ids, true);
    }

    private static function matchesValues(mixed $value, mixed $values): bool
    {
        $values = is_array($values) ? array_filter(array_map('strval', $values)) : [];

        return $values === [] || in_array((string) $value, $values, true);
    }

    private static function contains(string $value, mixed $needle): bool
    {
        $needle = trim((string) $needle);

        return $needle === '' || str_contains(mb_strtolower($value), mb_strtolower($needle));
    }

    /**
     * @param  list<string>  $values
     */
    private static function containsAny(array $values, mixed $needle): bool
    {
        $needle = trim((string) $needle);

        if ($needle === '') {
            return true;
        }

        foreach ($values as $value) {
            if (self::contains($value, $needle)) {
                return true;
            }
        }

        return false;
    }

    /**
     * @return list<string>
     */
    private static function memberScopedKeys(): array
    {
        return [
            'unit_id',
            'unit_ids',
            'member_ids',
            'district_ids',
            'rank_codes',
            'player_categories',
            'player_levels',
            'statuses',
            'member_name',
            'pno',
            'gender',
            'genders',
        ];
    }

    /**
     * @param  array<string, mixed>  $filters
     * @return list<int>
     */
    private static function legacyId(array $filters, string $key): array
    {
        return ($filters[$key] ?? null) === null ? [] : [(int) $filters[$key]];
    }

    /**
     * @param  array<string, mixed>  $filters
     * @return list<string>
     */
    private static function legacyValue(array $filters, string $key): array
    {
        return ($filters[$key] ?? null) === null ? [] : [(string) $filters[$key]];
    }
}
