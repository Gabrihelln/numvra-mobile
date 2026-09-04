module.exports = {
  apps: [
    {
      name: 'numvra-notification-scheduler',
      script: './node_modules/tsx/dist/cli.mjs',
      args: 'server/notifications/scheduler.ts',
      interpreter: 'node',
      cwd: __dirname,
      instances: 1,
      autorestart: true,
      watch: false,
      max_memory_restart: '256M',
      env: {
        NODE_ENV: 'production',
        TZ: 'America/Sao_Paulo',
        FIREBASE_PROJECT_ID: 'numvra-main',
        NOTIFICATION_SCHEDULER_INTERVAL_MS: '300000',
        NOTIFICATION_LOOKAHEAD_DAYS: '3',
        BUDGET_WARNING_THRESHOLD: '0.8',
      },
    },
  ],
};
