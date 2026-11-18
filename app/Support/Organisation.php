<?php

declare(strict_types=1);

namespace App\Support;

use App\Models\Organization;

class Organisation
{
    /**
     * Translation key used only as a fallback when an admin has not filled in
     * the display names under Settings → Organisation.
     */
    public const NAME_KEY = 'UP Police Sports Control Board (UPPSCB)';

    /**
     * The organisation name for letterheads, prints, exports and logos, in the
     * given (default: active) language, as maintained by the admin.
     */
    public static function name(?string $locale = null): string
    {
        $organization = self::current();
        $locale ??= app()->getLocale();

        $name = $locale === 'hi'
            ? $organization?->display_name_hi
            : $organization?->display_name_en;

        return filled($name)
            ? (string) $name
            : (string) (filled($organization?->display_name_en) ? $organization->display_name_en : __(self::NAME_KEY));
    }

    public static function current(): ?Organization
    {
        $organizationId = auth()->user()?->organization_id;

        return $organizationId
            ? Organization::query()->find($organizationId)
            : Organization::query()->orderBy('id')->first();
    }
}
