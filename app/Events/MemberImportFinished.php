<?php

declare(strict_types=1);

namespace App\Events;

use App\Models\Import;
use Illuminate\Broadcasting\InteractsWithSockets;
use Illuminate\Broadcasting\PrivateChannel;
use Illuminate\Contracts\Broadcasting\ShouldBroadcastNow;
use Illuminate\Queue\SerializesModels;

class MemberImportFinished implements ShouldBroadcastNow
{
    use InteractsWithSockets, SerializesModels;

    /**
     * @param  array{created: int, updated: int, skipped: int, failed: int}  $counts
     */
    public function __construct(
        public readonly Import $import,
        public readonly array $counts,
        public readonly ?string $templateError,
    ) {}

    public function broadcastOn(): PrivateChannel
    {
        return new PrivateChannel('organization.'.$this->import->organization_id);
    }

    public function broadcastAs(): string
    {
        return 'MemberImportFinished';
    }

    /**
     * @return array{import_id: int, filename: string, status: string, uploaded_by: int, counts: array{created: int, updated: int, skipped: int, failed: int}, error_count: int, template_error: string|null}
     */
    public function broadcastWith(): array
    {
        return [
            'import_id' => $this->import->id,
            'filename' => $this->import->filename,
            'status' => $this->import->status,
            'uploaded_by' => $this->import->uploaded_by,
            'counts' => $this->counts,
            'error_count' => count($this->import->rowErrors()),
            'template_error' => $this->templateError,
        ];
    }
}
