import { NotificationSchedulerService } from './notificationSchedulerService';

const hasArg = (name: string) => process.argv.includes(name);

const printHelp = () => {
  console.log(`Numvra Notification Scheduler

Usage:
  npm run notifications:scheduler
  npm run notifications:once
  npm run notifications:dry-run

Environment:
  FIREBASE_PROJECT_ID=numvra-main
  GOOGLE_APPLICATION_CREDENTIALS=/path/to/service-account.json
  # or FIREBASE_SERVICE_ACCOUNT='{"project_id":"...","client_email":"...","private_key":"..."}'
  NOTIFICATION_SCHEDULER_INTERVAL_MS=300000
  NOTIFICATION_LOOKAHEAD_DAYS=3
  BUDGET_WARNING_THRESHOLD=0.8
  TZ=America/Sao_Paulo
`);
};

if (hasArg('--help') || hasArg('-h')) {
  printHelp();
  process.exit(0);
}

const service = new NotificationSchedulerService({
  dryRun: hasArg('--dry-run'),
});

if (hasArg('--once') || hasArg('--dry-run')) {
  service
    .runOnce()
    .then((result) => {
      console.log(JSON.stringify(result, null, 2));
      process.exit(result.errors.length > 0 ? 1 : 0);
    })
    .catch((error) => {
      console.error('[scheduler] fatal error', error);
      process.exit(1);
    });
} else {
  const interval = service.start();

  const shutdown = () => {
    clearInterval(interval);
    console.log('[scheduler] stopped');
    process.exit(0);
  };

  process.on('SIGINT', shutdown);
  process.on('SIGTERM', shutdown);
}
