<?php

declare(strict_types=1);

namespace App\Rules;

use Closure;
use Illuminate\Contracts\Validation\ValidationRule;
use Illuminate\Support\Facades\DB;

class UniquePnoAcrossPeople implements ValidationRule
{
    public function __construct(
        private readonly int $organizationId,
        private readonly ?string $ignoreTable = null,
        private readonly ?int $ignoreId = null,
        private readonly ?int $ignoreMemberId = null,
        private readonly ?int $ignoreCoachId = null,
    ) {}

    public function validate(string $attribute, mixed $value, Closure $fail): void
    {
        $pno = trim((string) $value);

        if ($pno === '') {
            return;
        }

        foreach (['members', 'coaches', 'incharges'] as $table) {
            $query = DB::table($table)
                ->where('organization_id', $this->organizationId)
                ->where('pno', $pno)
                ->whereNull('deleted_at');

            if ($this->ignoreTable === $table && $this->ignoreId !== null) {
                $query->where('id', '!=', $this->ignoreId);
            }

            if ($table === 'members' && $this->ignoreMemberId !== null) {
                $query->where('id', '!=', $this->ignoreMemberId);
            }

            if ($table === 'coaches' && $this->ignoreCoachId !== null) {
                $query->where('id', '!=', $this->ignoreCoachId);
            }

            if ($query->exists()) {
                $fail(__('The PNO is already used by another member, coach, or team prabhari.'));

                return;
            }
        }
    }
}
