<?php

declare(strict_types=1);

namespace App\Http\Controllers;

use App\Http\Requests\StoreMediaFileRequest;
use App\Http\Requests\StorePromotionMediaFileRequest;
use App\Http\Resources\MediaFileResource;
use App\Models\MediaFile;
use App\Models\Member;
use App\Models\MemberPromotion;
use App\Models\Participation;
use App\Models\User;
use App\Services\MediaPathService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Gate;
use Illuminate\Support\Facades\Storage;

class MediaFileController extends Controller
{
    public function __construct(private readonly MediaPathService $pathService) {}

    /**
     * List all media for a participation.
     *
     * GET /participations/{participation}/media
     */
    public function index(Request $request, Participation $participation): JsonResponse
    {
        $this->authorizeParticipationMedia($request->user(), $participation);

        $media = $participation->media()->with('uploader:id,name')->latest()->get();

        return response()->json(MediaFileResource::collection($media));
    }

    /**
     * Upload one image for a participation.
     *
     * POST /participations/{participation}/media
     */
    public function store(StoreMediaFileRequest $request, Participation $participation): JsonResponse
    {
        $this->authorizeParticipationMedia($request->user(), $participation);

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
            'organization_id' => $participation->member?->organization_id ?? $participation->event->tournament->organization_id,
            'mediable_type' => Participation::class,
            'mediable_id' => $participation->id,
            'disk' => 'public',
            'path' => $path,
            'original_name' => $file->getClientOriginalName(),
            'mime_type' => $file->getMimeType() ?? 'image/jpeg',
            'size_bytes' => $file->getSize(),
            'caption' => $request->input('caption'),
            'uploaded_by' => $request->user()->id,
        ]);

        $mediaFile->load('uploader');

        return response()->json(new MediaFileResource($mediaFile), 201);
    }

    public function indexPromotion(Request $request, Member $member, MemberPromotion $promotion): JsonResponse
    {
        Gate::authorize('manageBenefits', $member);

        abort_if($promotion->member_id !== $member->id, 404);

        $media = $promotion->media()->with('uploader:id,name')->latest()->get();

        return response()->json(MediaFileResource::collection($media));
    }

    public function storePromotion(StorePromotionMediaFileRequest $request, Member $member, MemberPromotion $promotion): JsonResponse
    {
        Gate::authorize('manageBenefits', $member);

        abort_if($promotion->member_id !== $member->id, 404);

        $existing = $promotion->media()->count();

        if ($existing >= StoreMediaFileRequest::MAX_FILES_PER_CONTEXT) {
            return response()->json([
                'message' => __('validation.max_files', ['max' => StoreMediaFileRequest::MAX_FILES_PER_CONTEXT]),
            ], 422);
        }

        $file = $request->file('file');
        $path = $this->pathService->buildPath($promotion, $file);

        Storage::disk('public')->putFileAs(
            dirname($path),
            $file,
            basename($path),
        );

        $mediaFile = MediaFile::create([
            'organization_id' => $promotion->member->organization_id,
            'mediable_type' => MemberPromotion::class,
            'mediable_id' => $promotion->id,
            'disk' => 'public',
            'path' => $path,
            'original_name' => $file->getClientOriginalName(),
            'mime_type' => $file->getMimeType() ?? 'application/pdf',
            'size_bytes' => $file->getSize(),
            'caption' => $request->input('caption'),
            'uploaded_by' => $request->user()->id,
        ]);

        $mediaFile->load('uploader');

        return response()->json(new MediaFileResource($mediaFile), 201);
    }

    public function destroyPromotion(Member $member, MemberPromotion $promotion, MediaFile $mediaFile): JsonResponse
    {
        Gate::authorize('manageBenefits', $member);

        abort_if($promotion->member_id !== $member->id, 404);

        abort_if($mediaFile->mediable_type !== MemberPromotion::class || $mediaFile->mediable_id !== $promotion->id, 404);

        Storage::disk($mediaFile->disk)->delete($mediaFile->path);
        $mediaFile->delete();

        return response()->json(null, 204);
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

    private function authorizeParticipationMedia(User $user, Participation $participation): void
    {
        if ($participation->member_id !== null) {
            Gate::authorize('view', $participation->member);

            return;
        }

        Gate::authorize('update', $participation->event->tournament);
    }
}
