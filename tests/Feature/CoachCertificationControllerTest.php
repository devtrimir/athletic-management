<?php

declare(strict_types=1);

use App\Models\Coach;
use App\Models\CoachCertification;
use App\Models\Organization;
use App\Models\Permission;
use App\Models\Role;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Storage;

uses(RefreshDatabase::class);

// ---------------------------------------------------------------------------
// Helper
// ---------------------------------------------------------------------------

function certificationUser(string ...$permissions): User
{
    $org = Organization::factory()->create();
    $user = User::factory()->create(['organization_id' => $org->id]);

    if (count($permissions) > 0) {
        $role = Role::factory()->create(['organization_id' => $org->id]);
        DB::table('user_role')->insert(['user_id' => $user->id, 'role_id' => $role->id, 'organization_id' => $org->id]);

        foreach ($permissions as $code) {
            $perm = Permission::firstOrCreate(
                ['code' => $code],
                ['group' => explode('.', $code)[0], 'name_hi' => $code, 'name_en' => $code],
            );
            DB::table('role_permission')->insert(['role_id' => $role->id, 'permission_id' => $perm->id]);
        }
    }

    return $user;
}

beforeEach(function (): void {
    Storage::fake('local');
});

// ---------------------------------------------------------------------------
// Store / upload
// ---------------------------------------------------------------------------

test('store requires updateCertifications permission', function (): void {
    $user = certificationUser('coaches.view');
    $coach = Coach::factory()->create(['organization_id' => $user->organization_id]);

    $this->actingAs($user)
        ->post(route('coaches.certifications.store', $coach), [
            'name' => 'NIS Diploma',
        ])
        ->assertForbidden();
});

test('store accepts an attachment and persists meta columns', function (): void {
    $user = certificationUser('coaches.view', 'coaches.manageCertifications');
    $coach = Coach::factory()->create(['organization_id' => $user->organization_id]);
    $file = UploadedFile::fake()->create('certificate.pdf', 100, 'application/pdf');
    $size = $file->getSize();

    $this->actingAs($user)
        ->post(route('coaches.certifications.store', $coach), [
            'name' => 'NIS Diploma',
            'attachment' => $file,
        ])
        ->assertRedirect(route('coaches.certifications', $coach));

    $certification = CoachCertification::query()->where('coach_id', $coach->id)->firstOrFail();

    expect($certification->attachment_path)->toStartWith("coach-certifications/{$coach->organization_id}/")
        ->and($certification->attachment_original_name)->toBe('certificate.pdf')
        ->and($certification->mime_type)->toBe('application/pdf')
        ->and($certification->size_bytes)->toBe($size);

    Storage::disk('local')->assertExists($certification->attachment_path);
});

test('store rejects an attachment with an invalid mime type', function (): void {
    $user = certificationUser('coaches.view', 'coaches.manageCertifications');
    $coach = Coach::factory()->create(['organization_id' => $user->organization_id]);

    $this->actingAs($user)
        ->post(route('coaches.certifications.store', $coach), [
            'name' => 'NIS Diploma',
            'attachment' => UploadedFile::fake()->create('notes.txt', 10, 'text/plain'),
        ])
        ->assertSessionHasErrors(['attachment']);
});

test('store rejects an attachment larger than 5MB', function (): void {
    $user = certificationUser('coaches.view', 'coaches.manageCertifications');
    $coach = Coach::factory()->create(['organization_id' => $user->organization_id]);

    $this->actingAs($user)
        ->post(route('coaches.certifications.store', $coach), [
            'name' => 'NIS Diploma',
            'attachment' => UploadedFile::fake()->create('big.pdf', 6000, 'application/pdf'),
        ])
        ->assertSessionHasErrors(['attachment']);
});

test('updating a certification with a new attachment deletes the old file', function (): void {
    $user = certificationUser('coaches.view', 'coaches.manageCertifications');
    $coach = Coach::factory()->create(['organization_id' => $user->organization_id]);
    $oldPath = "coach-certifications/{$coach->organization_id}/old.pdf";
    Storage::disk('local')->put($oldPath, 'old content');
    $certification = CoachCertification::factory()->create([
        'coach_id' => $coach->id,
        'attachment_path' => $oldPath,
        'attachment_original_name' => 'old.pdf',
        'mime_type' => 'application/pdf',
        'size_bytes' => 10,
    ]);

    $this->actingAs($user)
        ->post(route('coaches.certifications.store', $coach), [
            'id' => $certification->id,
            'name' => 'Updated Certificate',
            'attachment' => UploadedFile::fake()->create('new.pdf', 50, 'application/pdf'),
        ])
        ->assertRedirect(route('coaches.certifications', $coach));

    $certification->refresh();

    expect($certification->attachment_path)->not->toBe($oldPath)
        ->and($certification->attachment_original_name)->toBe('new.pdf');

    Storage::disk('local')->assertMissing($oldPath);
    Storage::disk('local')->assertExists($certification->attachment_path);
});

test('updating a certification without an attachment keeps the existing file', function (): void {
    $user = certificationUser('coaches.view', 'coaches.manageCertifications');
    $coach = Coach::factory()->create(['organization_id' => $user->organization_id]);
    $path = "coach-certifications/{$coach->organization_id}/existing.pdf";
    Storage::disk('local')->put($path, 'content');
    $certification = CoachCertification::factory()->create([
        'coach_id' => $coach->id,
        'attachment_path' => $path,
        'attachment_original_name' => 'existing.pdf',
    ]);

    $this->actingAs($user)
        ->post(route('coaches.certifications.store', $coach), [
            'id' => $certification->id,
            'name' => 'Renamed Certificate',
        ])
        ->assertRedirect(route('coaches.certifications', $coach));

    expect($certification->refresh()->attachment_path)->toBe($path);

    Storage::disk('local')->assertExists($path);
});

test('replace never deletes legacy free-text attachment paths', function (): void {
    $user = certificationUser('coaches.view', 'coaches.manageCertifications');
    $coach = Coach::factory()->create(['organization_id' => $user->organization_id]);
    $certification = CoachCertification::factory()->create([
        'coach_id' => $coach->id,
        'attachment_path' => 'scanned copy kept in unit records',
    ]);

    $this->actingAs($user)
        ->post(route('coaches.certifications.store', $coach), [
            'id' => $certification->id,
            'name' => 'Updated Certificate',
            'attachment' => UploadedFile::fake()->create('new.pdf', 50, 'application/pdf'),
        ])
        ->assertRedirect(route('coaches.certifications', $coach));

    expect($certification->refresh()->attachment_path)->toStartWith("coach-certifications/{$coach->organization_id}/");
});

// ---------------------------------------------------------------------------
// Destroy
// ---------------------------------------------------------------------------

test('destroy deletes the stored file and soft deletes the record', function (): void {
    $user = certificationUser('coaches.view', 'coaches.manageCertifications');
    $coach = Coach::factory()->create(['organization_id' => $user->organization_id]);
    $path = "coach-certifications/{$coach->organization_id}/cert.pdf";
    Storage::disk('local')->put($path, 'content');
    $certification = CoachCertification::factory()->create([
        'coach_id' => $coach->id,
        'attachment_path' => $path,
        'attachment_original_name' => 'cert.pdf',
    ]);

    $this->actingAs($user)
        ->delete(route('coaches.certifications.destroy', [$coach, $certification]))
        ->assertRedirect(route('coaches.certifications', $coach));

    $this->assertSoftDeleted('coach_certifications', ['id' => $certification->id]);
    Storage::disk('local')->assertMissing($path);
});

test('destroy with legacy free-text attachment path does not fail', function (): void {
    $user = certificationUser('coaches.view', 'coaches.manageCertifications');
    $coach = Coach::factory()->create(['organization_id' => $user->organization_id]);
    $certification = CoachCertification::factory()->create([
        'coach_id' => $coach->id,
        'attachment_path' => 'scanned copy kept in unit records',
    ]);

    $this->actingAs($user)
        ->delete(route('coaches.certifications.destroy', [$coach, $certification]))
        ->assertRedirect(route('coaches.certifications', $coach));

    $this->assertSoftDeleted('coach_certifications', ['id' => $certification->id]);
});

// ---------------------------------------------------------------------------
// Preview / download
// ---------------------------------------------------------------------------

test('preview returns the file inline with the stored mime type', function (): void {
    $user = certificationUser('coaches.view');
    $coach = Coach::factory()->create(['organization_id' => $user->organization_id]);
    $path = "coach-certifications/{$coach->organization_id}/cert.pdf";
    Storage::disk('local')->put($path, 'pdf content');
    $certification = CoachCertification::factory()->create([
        'coach_id' => $coach->id,
        'attachment_path' => $path,
        'attachment_original_name' => 'cert.pdf',
        'mime_type' => 'application/pdf',
    ]);

    $response = $this->actingAs($user)
        ->get(route('coaches.certifications.attachment.preview', [$coach, $certification]));

    $response->assertOk();
    expect($response->headers->get('content-type'))->toContain('application/pdf')
        ->and($response->headers->get('content-disposition'))->toContain('inline')
        ->and($response->headers->get('content-disposition'))->toContain('cert.pdf');
});

test('download returns the file as an attachment with the original name', function (): void {
    $user = certificationUser('coaches.view');
    $coach = Coach::factory()->create(['organization_id' => $user->organization_id]);
    $path = "coach-certifications/{$coach->organization_id}/cert.pdf";
    Storage::disk('local')->put($path, 'pdf content');
    $certification = CoachCertification::factory()->create([
        'coach_id' => $coach->id,
        'attachment_path' => $path,
        'attachment_original_name' => 'cert.pdf',
        'mime_type' => 'application/pdf',
    ]);

    $response = $this->actingAs($user)
        ->get(route('coaches.certifications.attachment.download', [$coach, $certification]));

    $response->assertOk();
    expect($response->headers->get('content-disposition'))->toContain('attachment')
        ->and($response->headers->get('content-disposition'))->toContain('cert.pdf');
    expect($response->streamedContent())->toBe('pdf content');
});

test('preview and download require view permission', function (): void {
    $user = certificationUser();
    $coach = Coach::factory()->create(['organization_id' => $user->organization_id]);
    $path = "coach-certifications/{$coach->organization_id}/cert.pdf";
    Storage::disk('local')->put($path, 'pdf content');
    $certification = CoachCertification::factory()->create([
        'coach_id' => $coach->id,
        'attachment_path' => $path,
        'attachment_original_name' => 'cert.pdf',
    ]);

    $this->actingAs($user)
        ->get(route('coaches.certifications.attachment.preview', [$coach, $certification]))
        ->assertForbidden();

    $this->actingAs($user)
        ->get(route('coaches.certifications.attachment.download', [$coach, $certification]))
        ->assertForbidden();
});

test('attachment routes return 404 for a certification belonging to another coach', function (): void {
    $user = certificationUser('coaches.view');
    $coach = Coach::factory()->create(['organization_id' => $user->organization_id]);
    $otherCoach = Coach::factory()->create(['organization_id' => $user->organization_id]);
    $path = "coach-certifications/{$otherCoach->organization_id}/cert.pdf";
    Storage::disk('local')->put($path, 'pdf content');
    $certification = CoachCertification::factory()->create([
        'coach_id' => $otherCoach->id,
        'attachment_path' => $path,
        'attachment_original_name' => 'cert.pdf',
    ]);

    $this->actingAs($user)
        ->get(route('coaches.certifications.attachment.preview', [$coach, $certification]))
        ->assertNotFound();

    $this->actingAs($user)
        ->get(route('coaches.certifications.attachment.download', [$coach, $certification]))
        ->assertNotFound();
});

test('attachment routes return 404 for legacy free-text attachment paths', function (): void {
    $user = certificationUser('coaches.view');
    $coach = Coach::factory()->create(['organization_id' => $user->organization_id]);
    $certification = CoachCertification::factory()->create([
        'coach_id' => $coach->id,
        'attachment_path' => 'scanned copy kept in unit records',
    ]);

    $this->actingAs($user)
        ->get(route('coaches.certifications.attachment.preview', [$coach, $certification]))
        ->assertNotFound();

    $this->actingAs($user)
        ->get(route('coaches.certifications.attachment.download', [$coach, $certification]))
        ->assertNotFound();
});

test('attachment routes return 404 when the stored file is missing', function (): void {
    $user = certificationUser('coaches.view');
    $coach = Coach::factory()->create(['organization_id' => $user->organization_id]);
    $certification = CoachCertification::factory()->create([
        'coach_id' => $coach->id,
        'attachment_path' => "coach-certifications/{$coach->organization_id}/gone.pdf",
        'attachment_original_name' => 'gone.pdf',
    ]);

    $this->actingAs($user)
        ->get(route('coaches.certifications.attachment.preview', [$coach, $certification]))
        ->assertNotFound();

    $this->actingAs($user)
        ->get(route('coaches.certifications.attachment.download', [$coach, $certification]))
        ->assertNotFound();
});

test('attachment routes return 404 when the certification has no attachment', function (): void {
    $user = certificationUser('coaches.view');
    $coach = Coach::factory()->create(['organization_id' => $user->organization_id]);
    $certification = CoachCertification::factory()->create(['coach_id' => $coach->id]);

    $this->actingAs($user)
        ->get(route('coaches.certifications.attachment.preview', [$coach, $certification]))
        ->assertNotFound();
});

// ---------------------------------------------------------------------------
// Payload
// ---------------------------------------------------------------------------

test('certifications tab payload includes attachment urls', function (): void {
    $user = certificationUser('coaches.view');
    $coach = Coach::factory()->create(['organization_id' => $user->organization_id]);
    $path = "coach-certifications/{$coach->organization_id}/cert.pdf";
    Storage::disk('local')->put($path, 'pdf content');
    $certification = CoachCertification::factory()->create([
        'coach_id' => $coach->id,
        'attachment_path' => $path,
        'attachment_original_name' => 'cert.pdf',
        'mime_type' => 'application/pdf',
        'size_bytes' => 11,
    ]);
    CoachCertification::factory()->create([
        'coach_id' => $coach->id,
        'attachment_path' => 'free text reference',
    ]);

    $this->actingAs($user)
        ->get(route('coaches.certifications', $coach))
        ->assertOk()
        ->assertInertia(fn ($page) => $page
            ->where('coach.certifications.0.attachment.preview_url', route('coaches.certifications.attachment.preview', [$coach, $certification]))
            ->where('coach.certifications.0.attachment.download_url', route('coaches.certifications.attachment.download', [$coach, $certification]))
            ->where('coach.certifications.0.attachment.original_name', 'cert.pdf')
            ->where('coach.certifications.0.attachment.mime_type', 'application/pdf')
            ->where('coach.certifications.0.attachment.size_bytes', 11)
            ->where('coach.certifications.1.attachment', null)
        );
});
