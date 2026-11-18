<?php

declare(strict_types=1);

namespace App\Services;

use Illuminate\Support\Facades\Storage;
use Imagick;
use Symfony\Component\Process\ExecutableFinder;
use Symfony\Component\Process\Process;
use Throwable;

/**
 * Shrinks stored images (Imagick) and PDFs (Ghostscript) in place.
 * Every step degrades to "keep the original" when a tool is missing, fails,
 * or does not actually produce a smaller file.
 */
class FileCompressor
{
    public const MAX_IMAGE_EDGE = 2000;

    public const IMAGE_QUALITY = 80;

    /**
     * @return int Bytes saved (0 when the file was left untouched).
     */
    public function compressInPlace(string $disk, string $path): int
    {
        $absolute = Storage::disk($disk)->path($path);

        if (! is_file($absolute)) {
            return 0;
        }

        $mime = (string) mime_content_type($absolute);
        $temp = tempnam(sys_get_temp_dir(), 'cmp');

        try {
            $written = match (true) {
                in_array($mime, ['image/jpeg', 'image/png', 'image/webp'], true) => $this->compressImage($absolute, $temp),
                $mime === 'application/pdf' => $this->compressPdf($absolute, $temp),
                default => false,
            };

            $before = (int) filesize($absolute);
            $after = $written ? (int) filesize($temp) : $before;

            if ($after > 0 && $after < $before) {
                rename($temp, $absolute);

                return $before - $after;
            }

            return 0;
        } finally {
            if (is_file($temp)) {
                unlink($temp);
            }
        }
    }

    private function compressImage(string $source, string $target): bool
    {
        if (! class_exists(Imagick::class)) {
            return false;
        }

        try {
            $image = new Imagick($source);
            $image->autoOrient();
            $image->stripImage();

            if (max($image->getImageWidth(), $image->getImageHeight()) > self::MAX_IMAGE_EDGE) {
                $image->thumbnailImage(self::MAX_IMAGE_EDGE, self::MAX_IMAGE_EDGE, true);
            }

            $image->setImageCompressionQuality(self::IMAGE_QUALITY);
            $result = $image->writeImage($image->getImageFormat().':'.$target);
            $image->clear();

            return $result;
        } catch (Throwable) {
            return false;
        }
    }

    private function compressPdf(string $source, string $target): bool
    {
        $ghostscript = (new ExecutableFinder)->find('gs');

        if ($ghostscript === null) {
            return false;
        }

        $process = new Process([
            $ghostscript, '-sDEVICE=pdfwrite', '-dCompatibilityLevel=1.4', '-dPDFSETTINGS=/ebook',
            '-dNOPAUSE', '-dBATCH', '-dQUIET', '-sOutputFile='.$target, $source,
        ]);
        $process->setTimeout(120);

        try {
            return $process->run() === 0;
        } catch (Throwable) {
            return false;
        }
    }
}
