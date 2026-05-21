<?php

test('health endpoint returns ok', function (): void {
    $this->getJson('/api/health')
        ->assertSuccessful()
        ->assertExactJson(['status' => 'ok']);
});
