<?php

declare(strict_types=1);

namespace App\Support;

class Organisation
{
    /**
     * Translation key for the organisation name used on letterheads and
     * exports; the text itself lives once in lang/*.json.
     */
    public const NAME_KEY = 'UP Police Sports Control Board (UPPSCB)';

    public static function name(): string
    {
        return __(self::NAME_KEY);
    }
}
