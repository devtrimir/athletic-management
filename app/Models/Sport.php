<?php

namespace App\Models;

use App\Concerns\Auditable;
use App\Concerns\Tenanted;
use App\Observers\AuditObserver;
use Database\Factories\SportFactory;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Attributes\ObservedBy;
use Illuminate\Database\Eloquent\Casts\Attribute;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Support\Carbon;

/**
 * @property int $id
 * @property int $organization_id
 * @property string $name_hi
 * @property string $name_en
 * @property string $category
 * @property string $slug
 * @property Carbon $created_at
 * @property Carbon $updated_at
 */
#[Fillable(['organization_id', 'name_hi', 'name_en', 'category', 'slug'])]
#[ObservedBy([AuditObserver::class])]
class Sport extends Model
{
    /** @use HasFactory<SportFactory> */
    use Auditable, HasFactory, Tenanted;

    /** @var list<string> */
    protected $appends = ['name'];

    /** Locale-aware alias — returns name_en when locale is 'en', otherwise name_hi. */
    protected function name(): Attribute
    {
        return Attribute::make(get: fn () => app()->getLocale() === 'en' ? $this->name_en : $this->name_hi);
    }

    public function organization(): BelongsTo
    {
        return $this->belongsTo(Organization::class);
    }
}
