<?php

declare(strict_types=1);

namespace App\Http\Requests\Coaches;

use App\Models\Coach;
use App\Models\Rank;
use Illuminate\Contracts\Validation\Validator;
use Illuminate\Foundation\Http\FormRequest;

class StoreCoachPromotionRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    /**
     * @return array<string, array<int, mixed>>
     */
    public function rules(): array
    {
        return [
            'promotion_date' => ['nullable', 'date'],
            'from_rank' => ['nullable', 'string', 'max:100'],
            'to_rank' => ['nullable', 'string', 'max:100'],
            'cash_reward_amount' => ['nullable', 'numeric', 'min:0', 'max:9999999999.99'],
            'cash_reward_date' => ['nullable', 'date'],
            'cash_reward_reference' => ['nullable', 'string', 'max:100'],
            'cash_reward_remarks' => ['nullable', 'string'],
            'reason' => ['nullable', 'string'],
            'remarks' => ['nullable', 'string'],
            'evidences' => ['nullable', 'array'],
            'evidences.*.session_id' => ['required', 'integer', 'min:1'],
            'evidences.*.tournament_id' => ['required', 'integer', 'min:1'],
            'evidences.*.event_id' => ['required', 'integer', 'min:1'],
            'evidences.*.team_id' => ['required', 'integer', 'min:1'],
        ];
    }

    public function withValidator(Validator $validator): void
    {
        $validator->after(function (Validator $validator): void {
            if (! $this->filled('to_rank') && ! $this->filled('cash_reward_amount')) {
                $validator->errors()->add(
                    'to_rank',
                    __('Add a target rank or a cash reward amount.'),
                );
            }

            if (($this->filled('to_rank') || $this->filled('cash_reward_amount')) && count($this->input('evidences', [])) === 0) {
                $validator->errors()->add(
                    'evidences',
                    __('Select at least one tournament event for this record.'),
                );
            }

            $coach = $this->route('coach');
            $fromRank = $this->input('from_rank')
                ?: ($coach instanceof Coach ? $coach->rankMaster?->code : null);
            $toRank = $this->input('to_rank');

            if (! $fromRank || ! $toRank) {
                return;
            }

            $fromOrder = $this->rankOrder((string) $fromRank);
            $toOrder = $this->rankOrder((string) $toRank);

            if ($fromOrder !== null && $toOrder !== null && $toOrder <= $fromOrder) {
                $validator->errors()->add(
                    'to_rank',
                    __('The target rank must be higher than the current rank.'),
                );
            }
        });
    }

    private function rankOrder(string $code): ?int
    {
        return Rank::query()->where('code', $code)->value('rank_order');
    }
}
