<?php

namespace Database\Seeders;

use App\Models\Organization;
use App\Models\Sport;
use Illuminate\Database\Seeder;
use Illuminate\Support\Str;
use SplFileObject;

class SportSeeder extends Seeder
{
    public function run(): void
    {
        $org = Organization::firstOrCreate(
            ['code' => 'UPP'],
            ['name' => 'UP Police Sports Unit'],
        );

        $csv = new SplFileObject(database_path('data/sports.csv'));
        $csv->setFlags(SplFileObject::READ_CSV | SplFileObject::SKIP_EMPTY | SplFileObject::READ_AHEAD);

        $rows = [];
        $header = true;

        foreach ($csv as $line) {
            if ($header) {
                $header = false;

                continue;
            }

            [$name, $category] = $line;

            $rows[] = [
                'organization_id' => $org->id,
                'name' => $name,
                'category' => $category,
                'slug' => $this->slugForName($name),
            ];
        }

        Sport::upsert($rows, uniqueBy: ['organization_id', 'slug'], update: ['name', 'category', 'updated_at']);
    }

    private function slugForName(string $name): string
    {
        $slug = Str::slug($name);

        return $slug !== '' ? $slug : 'sport-'.substr(sha1($name), 0, 10);
    }
}
