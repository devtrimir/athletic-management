<?php

declare(strict_types=1);

namespace App\Support\Members;

/**
 * Column contract shared between the member import template export and the
 * members Excel import. Column order is the contract — the template warns the
 * client not to rename or reorder columns, and the import maps by position.
 */
class MemberImportSchema
{
    public const GENDERS = ['M', 'F', 'O'];

    public const PLAYER_CATEGORIES = ['GD', 'SPORTS_QUOTA'];

    /** Friendly dropdown labels for the template; resolved back to codes on import. */
    public const PLAYER_CATEGORY_LABELS = [
        'GD' => 'Ground Duty',
        'SPORTS_QUOTA' => 'Sports Quota',
    ];

    public const BLOOD_GROUPS = ['A+', 'A-', 'B+', 'B-', 'O+', 'O-', 'AB+', 'AB-'];

    /**
     * `date` marks date columns (Excel date format in the template); `ref`
     * marks columns backed by a DB reference list (`districts`, `units`,
     * `sports`, `tiers`, `ranks`) which becomes a named-range dropdown in the template.
     *
     * @return list<array{key: string, label: string, required: bool, example: string|null, list: list<string>|null, date: bool, ref: string|null}>
     */
    public static function columns(): array
    {
        return [
            ['key' => 'pno', 'label' => 'PNO / पीएनओ', 'required' => false, 'example' => '210712827', 'list' => null, 'date' => false, 'ref' => null],
            ['key' => 'full_name', 'label' => 'Full Name / पूरा नाम', 'required' => true, 'example' => 'मोहित राठोर', 'list' => null, 'date' => false, 'ref' => null],
            ['key' => 'father_name', 'label' => "Father's Name / पिता का नाम", 'required' => false, 'example' => 'रमेश राठोर', 'list' => null, 'date' => false, 'ref' => null],
            ['key' => 'gender', 'label' => 'Gender / लिंग', 'required' => true, 'example' => 'M', 'list' => self::GENDERS, 'date' => false, 'ref' => null],
            ['key' => 'dob', 'label' => 'Date of Birth / जन्म तिथि', 'required' => false, 'example' => '10.05.1999', 'list' => null, 'date' => true, 'ref' => null],
            ['key' => 'rank', 'label' => 'Rank / पद', 'required' => false, 'example' => 'Constable', 'list' => null, 'date' => false, 'ref' => 'ranks'],
            ['key' => 'mobile', 'label' => 'Mobile / मोबाइल नंबर', 'required' => false, 'example' => '6397707210', 'list' => null, 'date' => false, 'ref' => null],
            ['key' => 'player_category', 'label' => 'Category / श्रेणी', 'required' => true, 'example' => 'Ground Duty', 'list' => array_values(self::PLAYER_CATEGORY_LABELS), 'date' => false, 'ref' => null],
            ['key' => 'player_level', 'label' => 'Level / स्तर', 'required' => true, 'example' => 'NATIONAL', 'list' => null, 'date' => false, 'ref' => 'tiers'],
            ['key' => 'home_district', 'label' => 'Home District / गृह जनपद', 'required' => false, 'example' => null, 'list' => null, 'date' => false, 'ref' => 'districts'],
            ['key' => 'posting_district', 'label' => 'Posting District / तैनाती जनपद', 'required' => false, 'example' => null, 'list' => null, 'date' => false, 'ref' => 'districts'],
            ['key' => 'unit', 'label' => 'Unit / इकाई', 'required' => false, 'example' => null, 'list' => null, 'date' => false, 'ref' => 'units'],
            ['key' => 'joining_date', 'label' => 'Joining Date / भर्ती तिथि', 'required' => false, 'example' => '15.12.2021', 'list' => null, 'date' => true, 'ref' => null],
            ['key' => 'blood_group', 'label' => 'Blood Group / रक्त समूह', 'required' => false, 'example' => 'B+', 'list' => self::BLOOD_GROUPS, 'date' => false, 'ref' => null],
            ['key' => 'caste', 'label' => 'Caste / जाति', 'required' => false, 'example' => null, 'list' => null, 'date' => false, 'ref' => null],
            ['key' => 'initial_rank', 'label' => 'Initial Rank / भर्ती पद', 'required' => false, 'example' => null, 'list' => null, 'date' => false, 'ref' => 'ranks'],
            ['key' => 'sport', 'label' => 'Sport / खेल', 'required' => false, 'example' => null, 'list' => null, 'date' => false, 'ref' => 'sports'],
            ['key' => 'sport_event', 'label' => 'Sport Event / स्पर्धा', 'required' => false, 'example' => '48 kg Sanda', 'list' => null, 'date' => false, 'ref' => null],
            ['key' => 'team_since', 'label' => 'Team Since / टीम में कब से', 'required' => false, 'example' => null, 'list' => null, 'date' => true, 'ref' => null],
            ['key' => 'home_address', 'label' => 'Home Address / गृह पता', 'required' => false, 'example' => null, 'list' => null, 'date' => false, 'ref' => null],
        ];
    }

    /**
     * Named range used in the template for a reference list.
     */
    public static function refRangeName(string $ref): string
    {
        return match ($ref) {
            'districts' => 'DistrictList',
            'units' => 'UnitList',
            'sports' => 'SportList',
            'tiers' => 'TierList',
            'ranks' => 'RankList',
            default => throw new \InvalidArgumentException("Unknown member import reference: {$ref}"),
        };
    }

    /**
     * @return list<string>
     */
    public static function headings(): array
    {
        return array_map(
            static fn (array $column): string => $column['label'].($column['required'] ? ' *' : ''),
            self::columns(),
        );
    }

    /**
     * Column index (0-based) for a column key.
     */
    public static function indexOf(string $key): int
    {
        foreach (self::columns() as $index => $column) {
            if ($column['key'] === $key) {
                return $index;
            }
        }

        throw new \InvalidArgumentException("Unknown member import column: {$key}");
    }
}
