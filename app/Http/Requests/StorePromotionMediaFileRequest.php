<?php

declare(strict_types=1);

namespace App\Http\Requests;

use App\Models\MediaFile;
use Illuminate\Foundation\Http\FormRequest;

class StorePromotionMediaFileRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->user()?->can('upload', MediaFile::class) ?? false;
    }

    public function rules(): array
    {
        return [
            'file' => ['required', 'file', 'mimes:pdf,jpg,jpeg,png,webp', 'max:10240'],
            'caption' => ['nullable', 'string', 'max:500'],
        ];
    }
}
