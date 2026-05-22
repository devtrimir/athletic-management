<?php

namespace App\Concerns;

/**
 * Marker trait — opt-in to audit logging.
 *
 * Models using this trait must also carry #[ObservedBy([AuditObserver::class])]
 * to register the observer (calling static::observe() inside bootAuditable()
 * causes a circular boot exception in Laravel's model boot sequence).
 */
trait Auditable {}
