<?php

declare(strict_types=1);

use App\Support\GenderLabel;

it('translates gender codes into the active app language', function (): void {
    app()->setLocale('hi');

    expect(GenderLabel::for('M'))->toBe('पुरुष')
        ->and(GenderLabel::for('F'))->toBe('महिला')
        ->and(GenderLabel::for('O'))->toBe('अन्य');

    app()->setLocale('en');

    expect(GenderLabel::for('F'))->toBe('Female')
        ->and(GenderLabel::for(null))->toBe('')
        ->and(GenderLabel::for('X'))->toBe('X');
});
