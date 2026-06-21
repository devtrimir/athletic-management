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

        $header = true;
        $metadata = SportMasterDataCatalog::sports();

        foreach ($csv as $line) {
            if ($header) {
                $header = false;

                continue;
            }

            if ($line === [null] || ! is_array($line) || count($line) < 2) {
                continue;
            }

            [$name, $category] = $line;
            $sportMetadata = $metadata[$name] ?? null;

            Sport::withoutGlobalScopes()->updateOrCreate(
                [
                    'organization_id' => $org->id,
                    'name' => $name,
                ],
                [
                    'code' => $sportMetadata['code'] ?? strtoupper($this->slugForName($name)),
                    'category' => $category,
                    'slug' => $this->slugForName($name),
                    'description' => $sportMetadata['description'] ?? null,
                    'is_active' => true,
                    'sort_order' => $sportMetadata['sort_order'] ?? 0,
                ],
            );
        }
    }

    private function slugForName(string $name): string
    {
        $slug = Str::slug($name);

        return $slug !== '' ? $slug : 'sport-'.substr(sha1($name), 0, 10);
    }
}
