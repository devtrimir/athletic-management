<?php

declare(strict_types=1);

namespace App\Http\Requests;

use App\Models\MediaFile;
use Illuminate\Foundation\Http\FormRequest;

class StoreMediaFileRequest extends FormRequest
{
    /**
     * Allowed polymorphic mediable types (short class aliases).
     *
     * @var array<int, string>
     */
    private const ALLOWED_TYPES = ['participation', 'achievement'];

    /**
     * Maximum individual file size: 10 MB.
     */
    private const MAX_KB = 10240;

    /**
     * Maximum number of files per mediable context.
     */
    public const MAX_FILES_PER_CONTEXT = 20;

    public function authorize(): bool
    {
        return $this->user()?->can('upload', MediaFile::class) ?? false;
    }

    /**
     * @return array<string, mixed>
     */
    public function rules(): array
    {
        return [
            'file' => ['required', 'file', 'mimes:jpg,jpeg,png,webp', 'max:'.self::MAX_KB],
            'caption' => ['nullable', 'string', 'max:500'],
        ];
    }
}
