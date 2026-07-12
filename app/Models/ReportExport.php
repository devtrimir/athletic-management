<?php

declare(strict_types=1);

namespace App\Models;

use Database\Factories\ReportExportFactory;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Support\Carbon;

/**
 * @property int $id
 * @property int $organization_id
 * @property int $user_id
 * @property string $report_type
 * @property string $format
 * @property string $status
 * @property array<string, mixed>|null $filters
 * @property array<string, mixed>|null $options
 * @property string|null $file_path
 * @property string|null $file_name
 * @property string|null $error_message
 * @property Carbon|null $started_at
 * @property Carbon|null $completed_at
 * @property Carbon $created_at
 * @property Carbon $updated_at
 * @property-read Organization $organization
 * @property-read User $user
 */
#[Fillable([
    'organization_id',
    'user_id',
    'report_type',
    'format',
    'status',
    'filters',
    'options',
    'file_path',
    'file_name',
    'error_message',
    'started_at',
    'completed_at',
])]
class ReportExport extends Model
{
    /** @use HasFactory<ReportExportFactory> */
    use HasFactory;

    public const STATUS_PENDING = 'pending';

    public const STATUS_PROCESSING = 'processing';

    public const STATUS_COMPLETED = 'completed';

    public const STATUS_FAILED = 'failed';

    /** @return array<string, string> */
    protected function casts(): array
    {
        return [
            'filters' => 'array',
            'options' => 'array',
            'started_at' => 'datetime',
            'completed_at' => 'datetime',
        ];
    }

    /** @return BelongsTo<Organization, $this> */
    public function organization(): BelongsTo
    {
        return $this->belongsTo(Organization::class);
    }

    /** @return BelongsTo<User, $this> */
    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }
}
