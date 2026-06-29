<?php

declare(strict_types=1);

namespace App\Models;

use App\Concerns\Auditable;
use App\Concerns\Tenanted;
use App\Observers\AuditObserver;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Attributes\ObservedBy;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\SoftDeletes;
use Illuminate\Support\Carbon;

/**
 * @property int $id
 * @property int $organization_id
 * @property int $year
 * @property string $competition_name
 * @property string $proposed_month
 * @property string|null $proposed_month_annual
 * @property string $proposed_venue
 * @property bool $report_arrived
 * @property string|null $report_pdf_path
 * @property string|null $report_pdf_original_name
 * @property string|null $report_pdf_mime_type
 * @property int|null $report_pdf_size_bytes
 * @property Carbon|null $deleted_at
 * @property Carbon $created_at
 * @property Carbon $updated_at
 * @property-read Organization $organization
 */
#[Fillable([
    'organization_id',
    'year',
    'competition_name',
    'proposed_month',
    'proposed_month_annual',
    'proposed_venue',
    'report_arrived',
    'report_pdf_path',
    'report_pdf_original_name',
    'report_pdf_mime_type',
    'report_pdf_size_bytes',
    'created_by',
    'updated_by',
])]
#[ObservedBy([AuditObserver::class])]
class SportsCalendar extends Model
{
    /** @use HasFactory */
    use Auditable, HasFactory, SoftDeletes, Tenanted;

    protected function casts(): array
    {
        return [
            'report_arrived' => 'boolean',
        ];
    }

    /** @return BelongsTo<Organization, $this> */
    public function organization(): BelongsTo
    {
        return $this->belongsTo(Organization::class);
    }
}
