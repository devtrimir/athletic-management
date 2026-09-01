<?php

declare(strict_types=1);

namespace App\Imports;

/**
 * Fallback for uploads without a sheet named "Members" (CSV files, renamed
 * sheets) — reads the first sheet by index.
 */
class MembersFirstSheetImport extends MembersImport
{
    /** @return array<int, $this> */
    public function sheets(): array
    {
        return [0 => $this];
    }
}
