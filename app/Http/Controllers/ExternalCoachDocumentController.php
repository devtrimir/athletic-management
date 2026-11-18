<?php

declare(strict_types=1);

namespace App\Http\Controllers;

use App\Models\ExternalCoach;
use App\Models\ExternalCoachDocument;
use App\Services\AuditLogger;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Gate;
use Illuminate\Support\Facades\Storage;
use Inertia\Inertia;
use Symfony\Component\HttpFoundation\StreamedResponse;

class ExternalCoachDocumentController extends Controller
{
    public function show(Request $request, ExternalCoach $externalCoach, ExternalCoachDocument $document, AuditLogger $audit): StreamedResponse
    {
        Gate::authorize('view', $externalCoach);
        abort_unless($document->external_coach_id === $externalCoach->id, 404);

        $download = $request->boolean('download');
        $audit->log($download ? 'document_downloaded' : 'document_viewed', $externalCoach, $this->describe($document));

        $headers = ['Cache-Control' => 'private, no-store'];
        $disk = Storage::disk('local');

        return $download
            ? $disk->download($document->path, $document->original_name, $headers)
            : $disk->response($document->path, $document->original_name, $headers);
    }

    public function destroy(ExternalCoach $externalCoach, ExternalCoachDocument $document, AuditLogger $audit): RedirectResponse
    {
        Gate::authorize('update', $externalCoach);
        abort_unless($document->external_coach_id === $externalCoach->id, 404);

        Storage::disk('local')->delete($document->path);
        $document->delete();
        $audit->log('document_deleted', $externalCoach, $this->describe($document));

        Inertia::flash('toast', ['type' => 'success', 'message' => __('Document removed.')]);

        return back();
    }

    /**
     * @return array{document_id: int, type: string, original_name: string}
     */
    private function describe(ExternalCoachDocument $document): array
    {
        return [
            'document_id' => $document->id,
            'type' => $document->type,
            'original_name' => $document->original_name,
        ];
    }
}
