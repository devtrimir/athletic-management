<?php

declare(strict_types=1);

namespace App\Support;

class GenderLabel
{
    /**
     * Translate a stored gender code (M / F / O) into the active app language.
     */
    public static function for(?string $code): string
    {
        return match ($code) {
            'M' => __('Male'),
            'F' => __('Female'),
            'O' => __('Other gender'),
            default => $code ?? '',
        };
    }
}
