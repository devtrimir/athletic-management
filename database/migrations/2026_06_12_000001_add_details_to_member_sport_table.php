<?php

declare(strict_types=1);

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        if (! Schema::hasColumn('member_sport', 'role')) {
            Schema::table('member_sport', function (Blueprint $table): void {
                $table->string('role')->nullable()->after('sport_id');
            });
        }

        if (! Schema::hasColumn('member_sport', 'position')) {
            Schema::table('member_sport', function (Blueprint $table): void {
                $table->string('position')->nullable()->after('role');
            });
        }

        if (! Schema::hasColumn('member_sport', 'notes')) {
            Schema::table('member_sport', function (Blueprint $table): void {
                $table->text('notes')->nullable()->after('position');
            });
        }

        if (! Schema::hasColumn('member_sport', 'sport_event')) {
            Schema::table('member_sport', function (Blueprint $table): void {
                $table->string('sport_event')->nullable()->after('notes');
            });
        }
    }

    public function down(): void
    {
        Schema::table('member_sport', function (Blueprint $table): void {
            $columns = array_filter(['role', 'sport_event', 'position', 'notes'], fn (string $column): bool => Schema::hasColumn('member_sport', $column));

            if ($columns !== []) {
                $table->dropColumn($columns);
            }
        });
    }
};
