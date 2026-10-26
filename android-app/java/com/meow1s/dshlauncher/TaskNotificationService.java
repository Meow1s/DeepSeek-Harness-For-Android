package com.meow1s.dshlauncher;

import android.app.Notification;
import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.app.PendingIntent;
import android.app.Service;
import android.content.Context;
import android.content.Intent;
import android.os.Build;
import android.os.IBinder;

/**
 * Foreground service for the currently running DSH turn.
 */
public class TaskNotificationService extends Service {
    private static final String CHANNEL_RUNNING = "dsh_task_running";
    private static final String CHANNEL_DONE = "dsh_task_done";
    private static final String CHANNEL_FAILED = "dsh_task_failed";

    private static final int ID_RUNNING = 1001;
    private static final int ID_DONE = 1002;

    private static final String ACTION_START = "com.meow1s.dshlauncher.TASK_START";
    private static final String ACTION_UPDATE = "com.meow1s.dshlauncher.TASK_UPDATE";
    private static final String ACTION_FINISH = "com.meow1s.dshlauncher.TASK_FINISH";
    private static final String ACTION_CANCEL = "com.meow1s.dshlauncher.TASK_CANCEL";

    private static final String EXTRA_TITLE = "title";
    private static final String EXTRA_PROCESS = "process";
    private static final String EXTRA_STARTED_AT = "startedAt";
    private static final String EXTRA_FAILED = "failed";
    private static final String EXTRA_MESSAGE = "message";

    private boolean running = false;
    private String taskTitle = "DSH 任务";
    private String process = "正在处理…";
    private long startedAt = 0;

    static void start(Context context, String title, String text, long startedAtMillis) {
        Intent intent = new Intent(context, TaskNotificationService.class)
                .setAction(ACTION_START)
                .putExtra(EXTRA_TITLE, clean(title, "DSH 任务"))
                .putExtra(EXTRA_PROCESS, clean(text, "正在处理…"))
                .putExtra(EXTRA_STARTED_AT, startedAtMillis > 0 ? startedAtMillis : System.currentTimeMillis());
        startService(context, intent, true);
    }

    static void update(Context context, String text) {
        Intent intent = new Intent(context, TaskNotificationService.class)
                .setAction(ACTION_UPDATE)
                .putExtra(EXTRA_PROCESS, clean(text, "正在处理…"));
        startService(context, intent, false);
    }

    static void finish(Context context, boolean failed, String message) {
        Intent intent = new Intent(context, TaskNotificationService.class)
                .setAction(ACTION_FINISH)
                .putExtra(EXTRA_FAILED, failed)
                .putExtra(EXTRA_MESSAGE, clean(message, failed ? "任务失败" : "任务完成"));
        startService(context, intent, false);
    }

    static void cancel(Context context) {
        Intent intent = new Intent(context, TaskNotificationService.class)
                .setAction(ACTION_CANCEL);
        startService(context, intent, false);
    }

    private static void startService(Context context, Intent intent, boolean foreground) {
        try {
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O && foreground) {
                context.startForegroundService(intent);
            } else {
                context.startService(intent);
            }
        } catch (Exception ignored) {
            // Background-start restrictions or a disappearing process.
        }
    }

    private static String clean(String value, String fallback) {
        if (value == null) return fallback;
        String text = value.replace('\n', ' ').replace('\r', ' ').trim();
        if (text.isEmpty()) return fallback;
        return text.length() > 180 ? text.substring(0, 180) + "…" : text;
    }

    @Override
    public void onCreate() {
        super.onCreate();
        createChannels();
    }

    @Override
    public int onStartCommand(Intent intent, int flags, int startId) {
        if (intent == null) {
            stopSelf();
            return START_NOT_STICKY;
        }
        String action = intent.getAction();
        if (ACTION_START.equals(action)) {
            taskTitle = clean(intent.getStringExtra(EXTRA_TITLE), "DSH 任务");
            process = clean(intent.getStringExtra(EXTRA_PROCESS), "正在处理…");
            startedAt = intent.getLongExtra(EXTRA_STARTED_AT, System.currentTimeMillis());
            running = true;
            startForegroundSafely(ID_RUNNING, buildRunningNotification());
        } else if (ACTION_UPDATE.equals(action)) {
            process = clean(intent.getStringExtra(EXTRA_PROCESS), "正在处理…");
            if (running) notify(ID_RUNNING, buildRunningNotification());
        } else if (ACTION_FINISH.equals(action)) {
            boolean failed = intent.getBooleanExtra(EXTRA_FAILED, false);
            String message = clean(intent.getStringExtra(EXTRA_MESSAGE), failed ? "任务失败" : "任务完成");
            boolean wasRunning = running;
            running = false;
            if (wasRunning) stopForeground(STOP_FOREGROUND_REMOVE);
            notify(ID_DONE, buildDoneNotification(failed, message, wasRunning));
            stopSelf();
        } else if (ACTION_CANCEL.equals(action)) {
            running = false;
            stopForeground(STOP_FOREGROUND_REMOVE);
            stopSelf();
        }
        return START_NOT_STICKY;
    }

    private void startForegroundSafely(int id, Notification notification) {
        try {
            startForeground(id, notification);
        } catch (Exception error) {
            running = false;
            notify(id, notification);
            stopSelf();
        }
    }

    private void createChannels() {
        NotificationManager manager = getSystemService(NotificationManager.class);
        if (manager == null) return;

        NotificationChannel runningChannel = new NotificationChannel(
                CHANNEL_RUNNING, "DSH 任务进行中", NotificationManager.IMPORTANCE_LOW);
        runningChannel.setDescription("正在运行的 DSH 任务，常驻通知会显示用时和工作过程。");
        runningChannel.setShowBadge(false);
        runningChannel.setSound(null, null);
        manager.createNotificationChannel(runningChannel);

        NotificationChannel doneChannel = new NotificationChannel(
                CHANNEL_DONE, "DSH 任务完成", NotificationManager.IMPORTANCE_DEFAULT);
        doneChannel.setDescription("DSH 任务完成通知。");
        doneChannel.setShowBadge(true);
        manager.createNotificationChannel(doneChannel);

        NotificationChannel failedChannel = new NotificationChannel(
                CHANNEL_FAILED, "DSH 任务失败", NotificationManager.IMPORTANCE_HIGH);
        failedChannel.setDescription("DSH 任务失败通知。");
        failedChannel.setShowBadge(true);
        failedChannel.enableVibration(true);
        manager.createNotificationChannel(failedChannel);
    }

    private PendingIntent openIntent() {
        Intent open = new Intent(this, MainActivity.class)
                .setFlags(Intent.FLAG_ACTIVITY_SINGLE_TOP | Intent.FLAG_ACTIVITY_CLEAR_TOP);
        int flags = PendingIntent.FLAG_UPDATE_CURRENT;
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) flags |= PendingIntent.FLAG_IMMUTABLE;
        return PendingIntent.getActivity(this, 0, open, flags);
    }

    private Notification buildRunningNotification() {
        String shortText = process.length() > 70 ? process.substring(0, 70) + "…" : process;
        Notification.Builder builder = new Notification.Builder(this, CHANNEL_RUNNING)
                .setSmallIcon(R.drawable.ic_stat_dsh)
                .setContentTitle(taskTitle)
                .setContentText(shortText)
                .setStyle(new Notification.BigTextStyle().bigText(process))
                .setWhen(startedAt)
                .setUsesChronometer(true)
                .setShowWhen(true)
                .setOngoing(true)
                .setOnlyAlertOnce(true)
                .setCategory(Notification.CATEGORY_PROGRESS)
                .setVisibility(Notification.VISIBILITY_PUBLIC)
                .setContentIntent(openIntent());
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S) {
            builder.setForegroundServiceBehavior(Notification.FOREGROUND_SERVICE_IMMEDIATE);
        }
        return builder.build();
    }

    private Notification buildDoneNotification(boolean failed, String message, boolean includeElapsed) {
        String text = message;
        if (includeElapsed && startedAt > 0) {
            long seconds = Math.max(0, (System.currentTimeMillis() - startedAt) / 1000);
            String elapsed = (seconds >= 3600)
                    ? (seconds / 3600) + " 小时 " + ((seconds % 3600) / 60) + " 分钟"
                    : (seconds >= 60 ? (seconds / 60) + " 分钟 " + (seconds % 60) + " 秒" : seconds + " 秒");
            text = message + " · 用时 " + elapsed;
        }
        Notification.Builder builder = new Notification.Builder(this, failed ? CHANNEL_FAILED : CHANNEL_DONE)
                .setSmallIcon(R.drawable.ic_stat_dsh)
                .setContentTitle(failed ? "DSH 任务失败" : "DSH 任务完成")
                .setContentText(text.length() > 90 ? text.substring(0, 90) + "…" : text)
                .setStyle(new Notification.BigTextStyle().bigText(text))
                .setWhen(System.currentTimeMillis())
                .setShowWhen(true)
                .setAutoCancel(true)
                .setCategory(Notification.CATEGORY_STATUS)
                .setContentIntent(openIntent());
        return builder.build();
    }

    private void notify(int id, Notification notification) {
        NotificationManager manager = getSystemService(NotificationManager.class);
        if (manager != null) manager.notify(id, notification);
    }

    @Override
    public IBinder onBind(Intent intent) {
        return null;
    }
}
