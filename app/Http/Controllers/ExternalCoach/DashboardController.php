<?php

declare(strict_types=1);

namespace App\Http\Controllers\ExternalCoach;

use App\Http\Controllers\Controller;
use Inertia\Inertia;
use Inertia\Response;

class DashboardController extends Controller
{
    public function __invoke(): Response
    {
        return Inertia::render('external-coach/dashboard');
    }
}
