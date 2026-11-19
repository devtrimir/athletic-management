<?php

declare(strict_types=1);

namespace App\Actions\Points;

use App\Models\GameLevel;
use App\Models\PointScheme;
use App\Models\PointSchemeRow;
use App\Models\User;
use Illuminate\Support\Facades\DB;

/** Starts the next version as a draft, copying the points of an existing one (0 for levels it lacks). */
class CreatePointSchemeDraft
{
    public function __invoke(User $user, ?PointScheme $source, ?string $name = null): PointScheme
    {
        return DB::transaction(function () use ($user, $source, $name): PointScheme {
            $number = ((int) PointScheme::max('version_number')) + 1;
            $draft = PointScheme::create([
                'organization_id' => $user->organization_id,
                'version_number' => $number,
                'name' => $name ?: 'Version '.$number,
                'status' => PointScheme::STATUS_DRAFT,
                'created_by' => $user->id,
            ]);

            $copied = $source === null ? collect() : $source->rows()->get()->keyBy(fn (PointSchemeRow $row) => $row->game_level_id.'|'.$row->result);

            foreach (GameLevel::pluck('id') as $levelId) {
                foreach (PointScheme::RESULTS as $result) {
                    PointSchemeRow::create([
                        'point_scheme_id' => $draft->id,
                        'game_level_id' => $levelId,
                        'result' => $result,
                        'points' => $copied->get($levelId.'|'.$result)?->points ?? 0,
                    ]);
                }
            }

            return $draft;
        });
    }
}
