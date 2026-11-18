<?php

declare(strict_types=1);

use App\Support\Organisation;

it('returns the organisation name in the active app language', function (): void {
    app()->setLocale('hi');

    expect(Organisation::name())->toBe('उत्तर प्रदेश पुलिस स्पोर्ट्स नियंत्रण बोर्ड (यूपीपीएससीबी)');

    app()->setLocale('en');

    expect(Organisation::name())->toBe('UP Police Sports Control Board (UPPSCB)');
});
