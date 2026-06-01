<?php

declare(strict_types=1);

namespace App\Http\Controllers;

use App\Http\Requests\StoreMediaFileRequest;
use App\Http\Resources\MediaFileResource;
use App\Models\MediaFile;
use App\Models\Participation;
use App\Services\MediaPathService;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\Gate;
use Illuminate\Support\Facades\Storage;

class MediaFileController extends Controller
{
    public function __construct(private readonly MediaPathService $pathService) {}

    /**
     * Upload one image for a participation.
     *
     * POST /participations/{participation}/media
     */
    public function store(StoreMediaFileRequest $request, Participation $participation): JsonResponse
    {
        Gate::authorize('view', $participation->member);

        $existing = $participation->media()->count();

        if ($existing >= StoreMediaFileRequest::MAX_FILES_PER_CONTEXT) {
            return response()->json([
                'message' => __('validation.max_files', ['max' => StoreMediaFileRequest::MAX_FILES_PER_CONTEXT]),
            ], 422);
        }

        $file = $request->file('file');
        $path = $this->pathService->buildPath($participation, $file);

        Storage::disk('public')->putFileAs(
            dirname($path),
            $file,
            basename($path),
        );

        $mediaFile = MediaFile::create([
            'organization_id' => $participation->member->organization_id,
            'mediable_type' => Participation::class,
            'mediable_id' => $participation->id,
            'disk' => 'public',
            'path' => $path,
            'original_name' => $file->getClientOriginalName(),
            'mime_type' => $file->getMimeType() ?? 'image/jpeg',
            'size_bytes' => $file->getSize(),
            'caption_hi' => $request->input('caption'),
            'uploaded_by' => $request->user()->id,
        ]);

        $mediaFile->load('uploader');

        return response()->json(new MediaFileResource($mediaFile), 201);
    }

    /**
     * Delete a media file.
     *
     * DELETE /participations/{participation}/media/{mediaFile}
     */
    public function destroy(Participation $participation, MediaFile $mediaFile): JsonResponse
    {
        Gate::authorize('delete', $mediaFile);

        Storage::disk($mediaFile->disk)->delete($mediaFile->path);
        $mediaFile->delete();

        return response()->json(null, 204);
    }
}
