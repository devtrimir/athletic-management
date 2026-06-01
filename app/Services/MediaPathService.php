<?php

declare(strict_types=1);

namespace App\Services;

use App\Models\Achievement;
use App\Models\Participation;
use Illuminate\Http\UploadedFile;

/**
 * Builds deterministic, globally unique storage paths for media files.
 *
 * Path structure per mediable type:
 *  - Participation → org_{org_id}/tournaments/{tid}/events/{eid}/members/{mid}/
 *  - Achievement   → same path as its participation (1-to-1 relationship)
 *
 * The filename within the directory is always a UUID + extension, so two uploads
 * for the same participation never collide.
 */
class MediaPathService
{
    /**
     * Generate the full storage path for an uploaded file given its polymorphic owner.
     */
    public function buildPath(Participation|Achievement $mediable, UploadedFile $file): string
    {
        $dir = $this->buildDirectory($mediable);
        $uuid = (string) str()->uuid();
        $ext = $file->guessExtension() ?? 'jpg';

        return "{$dir}/{$uuid}.{$ext}";
    }

    /**
     * Resolve the directory segment for a mediable instance.
     */
    public function buildDirectory(Participation|Achievement $mediable): string
    {
        if ($mediable instanceof Achievement) {
            $mediable = $mediable->participation()->with('event.tournament', 'member')->firstOrFail();
        } else {
            $mediable->loadMissing('event.tournament', 'member');
        }

        $orgId = $mediable->member->organization_id;
        $tournamentId = $mediable->event->tournament_id;
        $eventId = $mediable->event_id;
        $memberId = $mediable->member_id;

        return "org_{$orgId}/tournaments/{$tournamentId}/events/{$eventId}/members/{$memberId}";
    }
}
