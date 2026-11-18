<?php

declare(strict_types=1);

namespace App\Http\Controllers;

use App\Models\ExternalCoach;
use App\Models\ExternalCoachDocument;
use Illuminate\Http\RedirectResponse;
use Illuminate\Support\Facades\Gate;
use Illuminate\Support\Facades\Storage;
use Inertia\Inertia;
use Symfony\Component\HttpFoundation\StreamedResponse;

class ExternalCoachDocumentController extends Controller
{
    public function show(ExternalCoach $externalCoach, ExternalCoachDocument $document): StreamedResponse
    {
        Gate::authorize('view', $externalCoach);
        abort_unless($document->external_coach_id === $externalCoach->id, 404);

        return Storage::disk('local')->response($document->path, $document->original_name);
    }

    public function destroy(ExternalCoach $externalCoach, ExternalCoachDocument $document): RedirectResponse
    {
        Gate::authorize('update', $externalCoach);
        abort_unless($document->external_coach_id === $externalCoach->id, 404);

        Storage::disk('local')->delete($document->path);
        $document->delete();

        Inertia::flash('toast', ['type' => 'success', 'message' => __('Document removed.')]);

        return back();
    }
}
