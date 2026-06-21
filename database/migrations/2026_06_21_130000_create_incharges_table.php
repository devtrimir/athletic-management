<?php

declare(strict_types=1);

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('incharges', function (Blueprint $table): void {
            $table->id();
            $table->foreignId('organization_id')->constrained()->cascadeOnDelete();
            $table->string('full_name');
            $table->string('pno', 20);
            $table->string('rank', 100)->nullable();
            $table->string('designation', 100)->nullable();
            $table->string('mobile', 20)->nullable();
            $table->string('email')->nullable();
            $table->boolean('is_active')->default(true);
            $table->text('remarks')->nullable();
            $table->softDeletes();
            $table->timestamps();

            $table->unique(['organization_id', 'pno']);
            $table->index(['organization_id', 'is_active']);
            $table->index('full_name');
        });

        $this->backfillIncharges();

        Schema::table('team_incharge_assignments', function (Blueprint $table): void {
            $table->foreign('incharge_id')->references('id')->on('incharges')->nullOnDelete();
        });
    }

    public function down(): void
    {
        Schema::table('team_incharge_assignments', function (Blueprint $table): void {
            $table->dropForeign(['incharge_id']);
        });

        DB::table('team_incharge_assignments')->update(['incharge_id' => null]);

        Schema::dropIfExists('incharges');
    }

    private function backfillIncharges(): void
    {
        $now = now();

        $rows = DB::table('team_incharge_assignments')
            ->join('teams', 'teams.id', '=', 'team_incharge_assignments.team_id')
            ->select([
                'teams.organization_id',
                'team_incharge_assignments.full_name',
                'team_incharge_assignments.pno',
                'team_incharge_assignments.rank',
                'team_incharge_assignments.designation',
                'team_incharge_assignments.mobile',
                'team_incharge_assignments.email',
                'team_incharge_assignments.remarks',
            ])
            ->whereNotNull('team_incharge_assignments.pno')
            ->where('team_incharge_assignments.pno', '!=', '')
            ->orderBy('team_incharge_assignments.id')
            ->get()
            ->unique(fn (object $row): string => $row->organization_id.'|'.$row->pno);

        foreach ($rows as $row) {
            DB::table('incharges')->updateOrInsert(
                [
                    'organization_id' => $row->organization_id,
                    'pno' => $row->pno,
                ],
                [
                    'full_name' => $row->full_name,
                    'rank' => $row->rank,
                    'designation' => $row->designation,
                    'mobile' => $row->mobile,
                    'email' => $row->email,
                    'is_active' => true,
                    'remarks' => $row->remarks,
                    'created_at' => $now,
                    'updated_at' => $now,
                ],
            );
        }

        $assignments = DB::table('team_incharge_assignments')
            ->join('teams', 'teams.id', '=', 'team_incharge_assignments.team_id')
            ->join('incharges', function ($join): void {
                $join->on('incharges.organization_id', '=', 'teams.organization_id')
                    ->on('incharges.pno', '=', 'team_incharge_assignments.pno');
            })
            ->select([
                'team_incharge_assignments.id as assignment_id',
                'incharges.id as incharge_id',
            ])
            ->whereNotNull('team_incharge_assignments.pno')
            ->where('team_incharge_assignments.pno', '!=', '')
            ->get();

        foreach ($assignments as $assignment) {
            DB::table('team_incharge_assignments')
                ->where('id', $assignment->assignment_id)
                ->update(['incharge_id' => $assignment->incharge_id]);
        }
    }
};
