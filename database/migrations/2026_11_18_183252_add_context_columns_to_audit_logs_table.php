<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('audit_logs', function (Blueprint $table): void {
            $table->string('actor_type', 30)->nullable()->after('user_id');
            $table->unsignedBigInteger('actor_id')->nullable()->after('actor_type');
            $table->string('source', 20)->nullable()->after('action');
            $table->string('ip_address', 45)->nullable();
            $table->string('user_agent', 500)->nullable();
            $table->string('url', 2048)->nullable();
            $table->string('http_method', 10)->nullable();
            $table->uuid('request_id')->nullable();

            $table->index(['entity', 'entity_id']);
            $table->index('request_id');
            $table->index(['actor_type', 'actor_id']);
        });
    }

    public function down(): void
    {
        Schema::table('audit_logs', function (Blueprint $table): void {
            $table->dropIndex(['entity', 'entity_id']);
            $table->dropIndex(['request_id']);
            $table->dropIndex(['actor_type', 'actor_id']);
            $table->dropColumn(['actor_type', 'actor_id', 'source', 'ip_address', 'user_agent', 'url', 'http_method', 'request_id']);
        });
    }
};
