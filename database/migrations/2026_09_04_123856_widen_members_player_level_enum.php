<?php

declare(strict_types=1);

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

/**
 * The members.player_level enum predates the tournament_tiers master growing
 * to six codes — STATE and OTHER pass form/import validation (Rule::exists on
 * tournament_tiers) but violated this stale check constraint, killing the
 * whole import transaction. Widen it to the full master list.
 */
return new class extends Migration
{
    /** @var list<string> */
    private const LEVELS = ['OTHER', 'ZONAL', 'STATE', 'AIPSC', 'NATIONAL', 'INTERNATIONAL'];

    /** @var list<string> */
    private const LEGACY_LEVELS = ['ZONAL', 'NATIONAL', 'INTERNATIONAL', 'AIPSC'];

    public function up(): void
    {
        $this->setLevels(self::LEVELS);
    }

    public function down(): void
    {
        $this->setLevels(self::LEGACY_LEVELS);
    }

    /**
     * Postgres can't change() an enum's inline check — drop and re-add the
     * named constraint directly. SQLite gets a table rebuild via change().
     * Only these two columns are re-declared: earlier rebuilds already dropped
     * the other enum checks on SQLite, and legacy-data tests rely on that
     * (e.g. writing a pre-constraint player_category like SKILLED), while the
     * current_status check is expected to stay enforced.
     *
     * @param  list<string>  $levels
     */
    private function setLevels(array $levels): void
    {
        if (DB::getDriverName() === 'pgsql') {
            $allowed = implode(', ', array_map(static fn (string $level): string => "'{$level}'", $levels));

            DB::statement('ALTER TABLE members DROP CONSTRAINT members_player_level_check');
            DB::statement("ALTER TABLE members ADD CONSTRAINT members_player_level_check CHECK ((player_level)::text = ANY ((ARRAY[{$allowed}])::text[]))");

            return;
        }

        Schema::table('members', function (Blueprint $table) use ($levels): void {
            $table->enum('player_level', $levels)->change();
            $table->enum('current_status', ['ACTIVE', 'INACTIVE', 'RESIGNED', 'DISMISSED', 'DECEASED', 'RETIRED', 'DOPING_DISQUALIFIED'])->default('ACTIVE')->change();
        });
    }
};
