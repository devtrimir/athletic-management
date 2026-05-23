<?php

declare(strict_types=1);

use Database\Seeders\MemberVolumeSeeder;
use Illuminate\Support\Facades\DB;

beforeEach(function () {
    DB::table('organizations')->insert([
        'name' => 'Volume Test Org',
        'code' => 'VTO01',
        'created_at' => now(),
        'updated_at' => now(),
    ]);
});

test('MemberVolumeSeeder inserts exactly 10 000 members', function () {
    (new MemberVolumeSeeder)->run();

    expect(DB::table('members')->count())->toBe(MemberVolumeSeeder::COUNT);
});

test('MemberVolumeSeeder member codes all match UPP-{year}-{6-digit} pattern', function () {
    (new MemberVolumeSeeder)->run();

    if (DB::connection()->getDriverName() === 'sqlite') {
        $invalidCount = DB::table('members')
            ->pluck('member_code')
            ->filter(fn (string $code) => ! preg_match('/^UPP-\d{4}-\d{6}$/', $code))
            ->count();
    } else {
        $invalidCount = DB::table('members')
            ->whereRaw("member_code NOT REGEXP '^UPP-[0-9]{4}-[0-9]{6}$'")
            ->count();
    }

    expect($invalidCount)->toBe(0);
});

test('MemberVolumeSeeder member codes are all unique', function () {
    (new MemberVolumeSeeder)->run();

    $total = DB::table('members')->count();
    $distinct = DB::table('members')->distinct()->count('member_code');

    expect($distinct)->toBe($total);
});
