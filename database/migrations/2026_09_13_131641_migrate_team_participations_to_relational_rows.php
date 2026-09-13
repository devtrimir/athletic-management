<?php

declare(strict_types=1);

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        $legacyParticipations = DB::table('participations')
            ->whereNull('member_id')
            ->get();

        foreach ($legacyParticipations as $legacy) {
            $lineupIds = [];
            if (! empty($legacy->lineup_member_ids)) {
                $decoded = is_array($legacy->lineup_member_ids)
                    ? $legacy->lineup_member_ids
                    : json_decode((string) $legacy->lineup_member_ids, true);
                $lineupIds = array_values(array_filter(array_map('intval', (array) $decoded), static fn (int $id): bool => $id > 0));
            }

            $achievement = DB::table('achievements')
                ->where('participation_id', $legacy->id)
                ->first();

            foreach ($lineupIds as $memberId) {
                $existing = DB::table('participations')
                    ->where('event_id', $legacy->event_id)
                    ->where('member_id', $memberId)
                    ->first();

                if ($existing) {
                    $newParticipationId = $existing->id;
                    DB::table('participations')->where('id', $newParticipationId)->update([
                        'team_id' => $legacy->team_id ?? $existing->team_id,
                        'position' => $legacy->position ?? $existing->position,
                        'session_id' => $legacy->session_id ?? $existing->session_id,
                    ]);
                } else {
                    $newParticipationId = DB::table('participations')->insertGetId([
                        'event_id' => $legacy->event_id,
                        'member_id' => $memberId,
                        'team_id' => $legacy->team_id,
                        'session_id' => $legacy->session_id,
                        'position' => $legacy->position,
                        'created_at' => $legacy->created_at ?? now(),
                        'updated_at' => $legacy->updated_at ?? now(),
                    ]);
                }

                if ($achievement) {
                    $hasAch = DB::table('achievements')->where('participation_id', $newParticipationId)->exists();
                    if (! $hasAch) {
                        DB::table('achievements')->insert([
                            'participation_id' => $newParticipationId,
                            'medal_type' => $achievement->medal_type,
                            'position' => $achievement->position,
                            'remarks' => $achievement->remarks,
                            'created_at' => $achievement->created_at ?? now(),
                            'updated_at' => $achievement->updated_at ?? now(),
                        ]);
                    }
                }
            }

            DB::table('achievements')->where('participation_id', $legacy->id)->delete();
            DB::table('participations')->where('id', $legacy->id)->delete();
        }

        Schema::table('participations', function (Blueprint $table): void {
            $table->foreignId('member_id')->nullable(false)->change();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('participations', function (Blueprint $table): void {
            $table->foreignId('member_id')->nullable()->change();
        });
    }
};
