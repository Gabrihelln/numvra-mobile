import { SystemNotificationPushWorker } from './systemNotificationPushWorker';

const printHelp = () => {
  console.log(`Numvra Manual System Notification Push

Usage:
  npm run notifications:manual-push

Create a document in system_notifications with:
  title: string
  text/body/message: string
  audience: "all" or userId/userIds
  pushStatus: "pending" or sendPush: true

The worker sends FCM and marks the document as pushSent=true.`);
};

if (process.argv.includes('--help') || process.argv.includes('-h')) {
  printHelp();
  process.exit(0);
}

new SystemNotificationPushWorker()
  .runOnce()
  .then((result) => {
    console.log(JSON.stringify(result, null, 2));
    process.exit(result.errors.length > 0 ? 1 : 0);
  })
  .catch((error) => {
    console.error('[manual-push] fatal error', error);
    process.exit(1);
  });
