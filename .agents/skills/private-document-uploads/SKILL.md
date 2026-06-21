---
name: private-document-uploads
description: Use when adding, refactoring, reviewing, or testing confidential document uploads in this Laravel Inertia app, including order documents, certificates, identity files, medical/legal/disciplinary documents, member special-achievement files, or any upload that must not be accessible through public storage URLs. Covers private disk storage, authorized download routes, Inertia payload URLs, cleanup, and Pest tests.
---

# Private Document Uploads

## Overview

Treat confidential uploaded documents as protected application data, not public assets. Store them on a private disk and expose them only through Laravel web routes that authorize the current user and validate ownership before streaming the file.

## Core Pattern

Use this pattern for documents that contain private, official, legal, medical, disciplinary, identity, financial, or internal information.

- Store files with `Storage::disk('local')`, not `public`.
- Keep metadata in the database: path, original filename, MIME type, size, and uploaded timestamp/user when the module tracks audit details.
- Never expose `asset('storage/...')`, `Storage::url()`, or `/storage/...` URLs for confidential files.
- Add a named authenticated web route for downloads, usually near the owning resource routes.
- When browser viewing is useful, add a separate authorized preview route using an inline file response, and keep the download route as an explicit user action.
- Authorize against the owning model before returning the file.
- Verify the uploaded record belongs to the route parent before streaming the file.
- Return `404` for missing files or parent/child mismatches so cross-record probing does not reveal data.
- Use `Storage::disk('local')->download($path, $originalName)` or `response()->file()` only after authorization passes.
- Delete files from the private disk when replacing or deleting the record.

## Laravel Implementation

Follow the app's existing controller/request/resource patterns. Before changing code, use Laravel Boost docs for the relevant Laravel/Inertia/testing APIs.

Controller download actions should follow this shape:

```php
public function document(ParentModel $parent, DocumentModel $document): StreamedResponse
{
    Gate::authorize('view', $parent);

    abort_unless($document->parent_id === $parent->id, 404);
    abort_if($document->path === null, 404);
    abort_unless(Storage::disk('local')->exists($document->path), 404);

    return Storage::disk('local')->download($document->path, $document->original_name);
}
```

When replacing an existing document:

- Delete the old private file after validation and before or after storing the new file, matching the module's transaction style.
- If migrating from a previous public implementation, optionally delete from both `local` and `public` during cleanup to remove old exposed files.
- Keep validation strict: file required/nullable as appropriate, allowed MIME types/extensions, and a size limit that matches the domain.

## Inertia And Wayfinder

For Inertia props, return the authorized route URL rather than a public storage URL:

```php
'document' => $model->document_path === null ? null : [
    'name' => $model->document_original_name,
    'url' => route('resource.document.preview', [$parent, $model]),
    'preview_url' => route('resource.document.preview', [$parent, $model]),
    'download_url' => route('resource.document', [$parent, $model]),
],
```

Use Wayfinder route imports in React when wiring upload forms, delete buttons, and download links. Regenerate Wayfinder after adding or renaming routes.

Use the global React component for browser preview/download UI:

```tsx
import { ConfidentialDocumentPreview } from '@/components/shared/confidential-document-preview';

<ConfidentialDocumentPreview
    document={document}
    subtitle={recordTitle}
    sizeLabel={sizeLabel}
/>
```

Do not create module-specific document preview modals unless the workflow truly needs a different viewing experience.

## Testing Checklist

Add focused Pest feature tests for each confidential document feature:

- Use `Storage::fake('local')`.
- Assert uploads are stored on `local`, not `public`.
- Assert Inertia props contain the authorized route URL and do not contain `/storage/`.
- Assert preview routes return inline file responses and download routes return attachment downloads.
- Assert authorized users can download the expected original filename.
- Assert unauthorized users receive `403` when policy denies access.
- Assert cross-org or mismatched parent/child access receives `404` or the module's established inaccessible response.
- Assert deleting or replacing the record removes the old private file.

Run focused tests, then required formatting/checks for touched files:

```bash
php artisan test --compact path/to/relevant-test.php
vendor/bin/pint --dirty --format agent
npm run lint
npm run types:check
npm run build
```

## Member Module Example

Member special-achievement order documents are confidential. They are stored on the `local` disk and exposed through authorized preview/download routes. `members.special-achievements.order-document.preview` returns an inline browser preview, while `members.special-achievements.order-document` downloads the original file. Both authorize `view` on the member, check the achievement belongs to that member, and must not be replaced with public storage URLs.
