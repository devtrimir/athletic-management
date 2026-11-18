<?php

declare(strict_types=1);

namespace App\Jobs;

use App\Models\ExternalCoachDocument;
use App\Services\FileCompressor;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Queue\Queueable;
use Illuminate\Support\Facades\Storage;

class CompressExternalCoachDocument implements ShouldQueue
{
    use Queueable;

    public bool $deleteWhenMissingModels = true;

    public int $timeout = 180;

    public function __construct(public ExternalCoachDocument $document) {}

    public function handle(FileCompressor $compressor): void
    {
        if ($compressor->compressInPlace('local', $this->document->path) > 0) {
            $this->document->update([
                'size_bytes' => Storage::disk('local')->size($this->document->path),
            ]);
        }
    }
}
