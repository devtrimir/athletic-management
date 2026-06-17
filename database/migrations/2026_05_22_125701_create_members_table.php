<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    private array $mysqlDrivers = ['mysql', 'mariadb'];

    /**
     * Run the migrations.
     */
    public function up(): void
    {
        Schema::create('members', function (Blueprint $table) {
            $table->id();
            $table->foreignId('organization_id')->constrained('organizations');

            $table->string('member_code', 30);
            $table->string('pno', 20)->nullable();

            $table->string('full_name');
            $table->string('full_name_normalized')->nullable()->comment('Populated by normalize_devanagari trigger in P2-T04');
            $table->string('father_name')->nullable();
            $table->string('rank', 100)->nullable();
            $table->string('designation', 100)->nullable();
            $table->string('photo_path')->nullable();
            $table->enum('blood_group', ['A+', 'A-', 'B+', 'B-', 'O+', 'O-', 'AB+', 'AB-'])->nullable();
            $table->string('caste', 100)->nullable();
            $table->date('promotion_date')->nullable();
            $table->string('appointment', 255)->nullable();
            $table->text('home_address')->nullable();
            $table->enum('recruitment_type', ['DIRECT', 'SPORTS_QUOTA', 'PROMOTED', 'OTHER'])->nullable();
            $table->string('sport_event', 100)->nullable();
            $table->text('other_notes')->nullable();
            $table->date('team_since')->nullable();

            $table->enum('gender', ['M', 'F', 'O']);
            $table->date('dob')->nullable();
            $table->date('joining_date')->nullable();
            $table->string('mobile', 20)->nullable();

            $table->foreignId('home_district_id')->nullable()->constrained('districts');
            $table->foreignId('current_unit_id')->nullable()->constrained('units');
            $table->foreignId('posting_district_id')->nullable()->constrained('districts')->nullOnDelete();
            $table->foreignId('sport_id')->nullable()->constrained('sports')->nullOnDelete();

            $table->enum('player_category', ['GD', 'SPORTS_QUOTA']);
            $table->enum('player_level', ['ZONAL', 'NATIONAL', 'INTERNATIONAL', 'AIPSC']);
            $table->enum('current_status', ['ACTIVE', 'RESIGNED', 'DISMISSED', 'DECEASED', 'RETIRED'])
                ->default('ACTIVE');

            $table->json('source_refs')->nullable()->comment('Legacy workbook source references');

            $table->softDeletes();
            $table->timestamps();

            $table->unique(['organization_id', 'member_code']);
            $table->unique(['organization_id', 'pno']);
            $table->index('organization_id');
            $table->index('mobile');
            $table->index('current_status');
            $table->index('posting_district_id');
            $table->index('sport_id');
        });

        $this->ensureNormalizeTriggers();
        $this->ensureFullTextIndex();
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('members');
    }

    private function ensureNormalizeTriggers(): void
    {
        if (! $this->isMySqlDriver() || ! $this->normalizeFunctionExists()) {
            return;
        }

        DB::unprepared('DROP TRIGGER IF EXISTS trg_members_normalize_before_insert');
        DB::unprepared('DROP TRIGGER IF EXISTS trg_members_normalize_before_update');

        DB::unprepared(<<<'SQL'
            CREATE TRIGGER trg_members_normalize_before_insert
            BEFORE INSERT ON members
            FOR EACH ROW
            BEGIN
                IF NEW.full_name IS NOT NULL THEN
                    SET NEW.full_name_normalized = normalize_devanagari(NEW.full_name);
                END IF;
            END
        SQL);

        DB::unprepared(<<<'SQL'
            CREATE TRIGGER trg_members_normalize_before_update
            BEFORE UPDATE ON members
            FOR EACH ROW
            BEGIN
                IF NEW.full_name IS NOT NULL THEN
                    SET NEW.full_name_normalized = normalize_devanagari(NEW.full_name);
                END IF;
            END
        SQL);
    }

    private function ensureFullTextIndex(): void
    {
        if (! $this->isMySqlDriver()) {
            return;
        }

        if (! $this->indexExists('members', 'ft_full_name_norm')) {
            DB::unprepared(
                'ALTER TABLE members ADD FULLTEXT INDEX ft_full_name_norm (full_name_normalized) WITH PARSER ngram',
            );
        }
    }

    private function indexExists(string $table, string $index): bool
    {
        return DB::table('information_schema.statistics')
            ->where('table_schema', DB::raw('database()'))
            ->where('table_name', $table)
            ->where('index_name', $index)
            ->exists();
    }

    private function normalizeFunctionExists(): bool
    {
        return DB::table('information_schema.routines')
            ->where('routine_schema', DB::raw('database()'))
            ->where('routine_name', 'normalize_devanagari')
            ->where('routine_type', 'FUNCTION')
            ->exists();
    }

    private function isMySqlDriver(): bool
    {
        return in_array(DB::connection()->getDriverName(), $this->mysqlDrivers, true);
    }
};
