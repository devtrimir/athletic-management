/**
 * PM2 ecosystem file for background Laravel processes.
 *
 * Usage:
 *   pm2 start ecosystem.config.cjs
 *   pm2 save
 *   pm2 startup
 *
 * Apps:
 *   - athletic-management-worker:            processes the default queue
 *   - athletic-management-attendance-worker: processes the attendance queue (auto-absent inserts)
 *   - athletic-management-scheduler:         runs `artisan schedule:work` every minute
 *
 * If you switch to Laravel Horizon, replace the `athletic-management-worker` and
 * `athletic-management-attendance-worker` apps with the commented
 * `athletic-management-horizon` app below.
 */
module.exports = {
    apps: [
        {
            name: 'athletic-management-worker',
            script: 'artisan',
            args: 'queue:work --queue=default --sleep=3 --tries=3 --max-time=14400',
            interpreter: 'php',
            cwd: __dirname,
            instances: 1,
            autorestart: true,
            max_restarts: 10,
            restart_delay: 5000,
            watch: false,
            env: {
                APP_ENV: 'production',
            },
            log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
            error_file: './storage/logs/worker-error.log',
            out_file: './storage/logs/worker-out.log',
            merge_logs: true,
            time: true,
        },
        {
            name: 'athletic-management-attendance-worker',
            script: 'artisan',
            args: 'queue:work --queue=attendance --sleep=3 --tries=3 --max-time=14400',
            interpreter: 'php',
            cwd: __dirname,
            instances: 1,
            autorestart: true,
            max_restarts: 10,
            restart_delay: 5000,
            watch: false,
            env: {
                APP_ENV: 'production',
            },
            log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
            error_file: './storage/logs/attendance-worker-error.log',
            out_file: './storage/logs/attendance-worker-out.log',
            merge_logs: true,
            time: true,
        },
        // {
        //     name: 'athletic-management-horizon',
        //     script: 'artisan',
        //     args: 'horizon',
        //     interpreter: 'php',
        //     cwd: __dirname,
        //     instances: 1,
        //     autorestart: true,
        //     max_restarts: 10,
        //     restart_delay: 5000,
        //     watch: false,
        //     env: {
        //         APP_ENV: 'production',
        //     },
        //     log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
        //     error_file: './storage/logs/horizon-error.log',
        //     out_file: './storage/logs/horizon-out.log',
        //     merge_logs: true,
        //     time: true,
        // },
        {
            name: 'athletic-management-scheduler',
            script: 'artisan',
            args: 'schedule:work',
            interpreter: 'php',
            cwd: __dirname,
            instances: 1,
            autorestart: true,
            max_restarts: 10,
            restart_delay: 5000,
            watch: false,
            env: {
                APP_ENV: 'production',
            },
            log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
            error_file: './storage/logs/scheduler-error.log',
            out_file: './storage/logs/scheduler-out.log',
            merge_logs: true,
            time: true,
        },
    ],
};
