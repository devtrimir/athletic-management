<?php

declare(strict_types=1);

namespace App\Events;

use Illuminate\Broadcasting\InteractsWithSockets;
use Illuminate\Broadcasting\PrivateChannel;
use Illuminate\Contracts\Broadcasting\ShouldBroadcastNow;
use Illuminate\Queue\SerializesModels;

/**
 * Broadcast after each member import row is processed so the uploader's
 * dialog can tick rows off live. Only the uploader's active import session
 * consumes these (filtered by import_id client-side); every data row in the
 * file gets exactly one event (created / updated / skipped / failed).
 */
class MemberImportRowProcessed implements ShouldBroadcastNow
{
    use InteractsWithSockets, SerializesModels;

    /**
     * @param  list<string>  $errors
     */
    public function __construct(
        public readonly int $importId,
        public readonly int $organizationId,
        public readonly int $row,
        public readonly ?string $pno,
        public readonly string $name,
        public readonly string $result,
        public readonly array $errors,
        public readonly int $processed,
    ) {}

    public function broadcastOn(): PrivateChannel
    {
        return new PrivateChannel('organization.'.$this->organizationId);
    }

    public function broadcastAs(): string
    {
        return 'MemberImportRowProcessed';
    }

    /**
     * @return array{import_id: int, row: int, pno: string|null, name: string, result: string, errors: list<string>, processed: int}
     */
    public function broadcastWith(): array
    {
        return [
            'import_id' => $this->importId,
            'row' => $this->row,
            'pno' => $this->pno,
            'name' => $this->name,
            'result' => $this->result,
            'errors' => $this->errors,
            'processed' => $this->processed,
        ];
    }
}
