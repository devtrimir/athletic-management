<?php

declare(strict_types=1);

namespace App\Models;

use App\Concerns\Tenanted;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Support\Carbon;

/**
 * @property int $id
 * @property int $organization_id
 * @property int $uploaded_by
 * @property string $filename
 * @property string $sha256
 * @property int|null $sheet_count
 * @property string $status
 * @property array<string, mixed>|null $mapping_template
 * @property string|null $error_log
 * @property Carbon|null $uploaded_at
 */
class Import extends Model
{
    use Tenanted;

    public const STATUS_COMPLETED = 'COMPLETED';

    public const STATUS_FAILED = 'FAILED';

    public const STATUS_PROCESSING = 'PROCESSING';

    protected $fillable = [
        'organization_id',
        'uploaded_by',
        'filename',
        'sha256',
        'sheet_count',
        'status',
        'mapping_template',
        'error_log',
        'uploaded_at',
    ];

    protected function casts(): array
    {
        return [
            'mapping_template' => 'array',
            'uploaded_at' => 'datetime',
        ];
    }

    /** @return BelongsTo<Organization, $this> */
    public function organization(): BelongsTo
    {
        return $this->belongsTo(Organization::class);
    }

    /** @return BelongsTo<User, $this> */
    public function uploader(): BelongsTo
    {
        return $this->belongsTo(User::class, 'uploaded_by');
    }

    /**
     * Decoded row-level error entries stored in the error_log column.
     *
     * @return list<array{row: int, name: string, errors: list<string>}>
     */
    public function rowErrors(): array
    {
        if ($this->error_log === null || $this->error_log === '') {
            return [];
        }

        $decoded = json_decode($this->error_log, true);

        return is_array($decoded) ? array_values($decoded) : [];
    }
}
