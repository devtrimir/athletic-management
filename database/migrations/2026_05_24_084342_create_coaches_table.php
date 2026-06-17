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
        Schema::create('coaches', function (Blueprint $table): void {
            $table->id();
            $table->foreignId('organization_id')->constrained('organizations');

            // Optional link to a member record (when the coach is also a serving constable).
            $table->foreignId('member_id')->nullable()->constrained('members')->nullOnDelete();

            $table->string('full_name');
            $table->string('pno', 20)->nullable();
            $table->string('mobile', 20)->nullable();
            $table->boolean('nis_certified')->default(false);
            $table->string('display_name')->nullable();
            $table->string('designation')->nullable();
            $table->string('email')->nullable();
            $table->enum('gender', ['M', 'F', 'O'])->nullable();
            $table->date('date_of_birth')->nullable();
            $table->enum('coach_status', ['ACTIVE', 'INACTIVE', 'RETIRED'])->default('ACTIVE');
            $table->text('bio')->nullable();
            $table->text('address')->nullable();
            $table->string('photo_path')->nullable();
            $table->enum('blood_group', ['A+', 'A-', 'B+', 'B-', 'O+', 'O-', 'AB+', 'AB-'])->nullable();
            $table->foreignId('district_id')->nullable()->constrained('districts')->nullOnDelete();
            $table->foreignId('unit_id')->nullable()->constrained('units')->nullOnDelete();
            if (Schema::hasTable('nis_masters')) {
                $table->foreignId('nis_master_id')->nullable()->constrained('nis_masters')->nullOnDelete();
            } else {
                $table->unsignedBigInteger('nis_master_id')->nullable();
            }

            if (Schema::hasTable('tournament_tiers')) {
                $table->foreignId('tier_master_id')->nullable()->constrained('tournament_tiers')->nullOnDelete();
            } else {
                $table->unsignedBigInteger('tier_master_id')->nullable();
            }

            if (Schema::hasTable('ranks')) {
                $table->foreignId('rank_master_id')->nullable()->constrained('ranks')->nullOnDelete();
            } else {
                $table->unsignedBigInteger('rank_master_id')->nullable();
            }

            if (Schema::hasTable('designations')) {
                $table->foreignId('designation_master_id')->nullable()->constrained('designations')->nullOnDelete();
            } else {
                $table->unsignedBigInteger('designation_master_id')->nullable();
            }

            $table->softDeletes();
            $table->timestamps();

            // MySQL allows multiple NULLs in a UNIQUE index, so this enforces
            // uniqueness only for rows where pno IS NOT NULL — matching the spec.
            $table->unique(['organization_id', 'pno']);
            $table->index('organization_id');
            $table->index('member_id');
            $table->index('coach_status');
            $table->index(['district_id', 'unit_id']);
            $table->index(
                ['nis_master_id', 'tier_master_id', 'rank_master_id', 'designation_master_id'],
                'coaches_nis_masters_idx'
            );
        });

        $this->ensureMasterReferenceColumns();
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('coaches');
    }

    private function ensureMasterReferenceColumns(): void
    {
        if (! Schema::hasTable('coaches')) {
            return;
        }

        Schema::table('coaches', function (Blueprint $table): void {
            if (! Schema::hasColumn('coaches', 'blood_group')) {
                $table->enum('blood_group', ['A+', 'A-', 'B+', 'B-', 'O+', 'O-', 'AB+', 'AB-'])->nullable()->after('photo_path');
            }

            if (! Schema::hasColumn('coaches', 'district_id')) {
                $table->foreignId('district_id')->nullable()->after('photo_path')->constrained('districts')->nullOnDelete();
            }

            if (! Schema::hasColumn('coaches', 'unit_id')) {
                $table->foreignId('unit_id')->nullable()->after('district_id')->constrained('units')->nullOnDelete();
            }

            if (! Schema::hasColumn('coaches', 'nis_master_id')) {
                if (Schema::hasTable('nis_masters')) {
                    $table->foreignId('nis_master_id')->nullable()->after('unit_id')->constrained('nis_masters')->nullOnDelete();
                } else {
                    $table->unsignedBigInteger('nis_master_id')->nullable()->after('unit_id');
                }
            }

            if (! Schema::hasColumn('coaches', 'tier_master_id')) {
                if (Schema::hasTable('tournament_tiers')) {
                    $table->foreignId('tier_master_id')->nullable()->after('nis_master_id')->constrained('tournament_tiers')->nullOnDelete();
                } else {
                    $table->unsignedBigInteger('tier_master_id')->nullable()->after('nis_master_id');
                }
            }

            if (! Schema::hasColumn('coaches', 'rank_master_id')) {
                if (Schema::hasTable('ranks')) {
                    $table->foreignId('rank_master_id')->nullable()->after('tier_master_id')->constrained('ranks')->nullOnDelete();
                } else {
                    $table->unsignedBigInteger('rank_master_id')->nullable()->after('tier_master_id');
                }
            }

            if (! Schema::hasColumn('coaches', 'designation_master_id')) {
                if (Schema::hasTable('designations')) {
                    $table->foreignId('designation_master_id')->nullable()->after('rank_master_id')->constrained('designations')->nullOnDelete();
                } else {
                    $table->unsignedBigInteger('designation_master_id')->nullable()->after('rank_master_id');
                }
            }

            if (! $this->hasIndex('coaches', 'coaches_nis_masters_idx')) {
                $table->index(
                    ['nis_master_id', 'tier_master_id', 'rank_master_id', 'designation_master_id'],
                    'coaches_nis_masters_idx'
                );
            }
        });

        if (! $this->isMySqlDriver()) {
            return;
        }

        Schema::table('coaches', function (Blueprint $table): void {
            if (Schema::hasColumn('coaches', 'tier_master_id') && $this->foreignKeyExists('coaches_tier_master_id_foreign')) {
                $table->dropConstrainedForeignId('tier_master_id');
            }

            if (Schema::hasColumn('coaches', 'rank_master_id') && $this->foreignKeyExists('coaches_rank_master_id_foreign')) {
                $table->dropConstrainedForeignId('rank_master_id');
            }

            if (
                Schema::hasColumn('coaches', 'designation_master_id')
                && $this->foreignKeyExists('coaches_designation_master_id_foreign')
            ) {
                $table->dropConstrainedForeignId('designation_master_id');
            }
        });

        Schema::table('coaches', function (Blueprint $table): void {
            if (Schema::hasColumn('coaches', 'tier_master_id') && ! $this->foreignKeyExists('coaches_tier_master_id_foreign')) {
                if (Schema::hasTable('tournament_tiers')) {
                    $table->foreign('tier_master_id')->references('id')->on('tournament_tiers')->nullOnDelete();
                }
            }

            if (Schema::hasColumn('coaches', 'rank_master_id') && ! $this->foreignKeyExists('coaches_rank_master_id_foreign')) {
                if (Schema::hasTable('ranks')) {
                    $table->foreign('rank_master_id')->references('id')->on('ranks')->nullOnDelete();
                }
            }

            if (
                Schema::hasColumn('coaches', 'designation_master_id')
                && ! $this->foreignKeyExists('coaches_designation_master_id_foreign')
            ) {
                if (Schema::hasTable('designations')) {
                    $table->foreign('designation_master_id')->references('id')->on('designations')->nullOnDelete();
                }
            }

            if (Schema::hasColumn('coaches', 'nis_master_id') && ! $this->foreignKeyExists('coaches_nis_master_id_foreign')) {
                if (Schema::hasTable('nis_masters')) {
                    $table->foreign('nis_master_id')->references('id')->on('nis_masters')->nullOnDelete();
                }
            }
        });
    }

    private function hasIndex(string $table, string $index): bool
    {
        if (! $this->isMySqlDriver()) {
            return false;
        }

        return DB::table('information_schema.statistics')
            ->whereRaw('table_schema = schema()')
            ->where('table_name', $table)
            ->where('index_name', $index)
            ->exists();
    }

    private function foreignKeyExists(string $constraint): bool
    {
        if (! $this->isMySqlDriver()) {
            return false;
        }

        return DB::table('information_schema.table_constraints')
            ->whereRaw('table_schema = schema()')
            ->where('table_name', 'coaches')
            ->where('constraint_name', $constraint)
            ->where('constraint_type', 'FOREIGN KEY')
            ->exists();
    }

    private function isMySqlDriver(): bool
    {
        return in_array(DB::connection()->getDriverName(), ['mysql', 'mariadb'], true);
    }
};
