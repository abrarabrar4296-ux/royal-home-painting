package com.royalhomepainting.royal_home_painting_app

import android.Manifest
import android.app.Notification
import android.app.NotificationChannel
import android.app.NotificationManager
import android.app.PendingIntent
import android.content.Context
import android.content.Intent
import android.content.pm.PackageManager
import android.graphics.Color
import android.media.AudioAttributes
import android.media.RingtoneManager
import android.net.Uri
import android.os.Build
import android.os.Bundle
import io.flutter.embedding.android.FlutterActivity
import io.flutter.embedding.engine.FlutterEngine
import io.flutter.plugin.common.MethodChannel

class MainActivity : FlutterActivity() {
    private val CHANNEL_NAME = "com.royalhomepainting.app/notifications"
    private val NOTIF_CHANNEL_ID = "royal_leads_channel"
    private val NOTIF_PERMISSION_REQ_CODE = 1001

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        createNotificationChannel()
        requestNativeNotificationPermission()
    }

    override fun configureFlutterEngine(flutterEngine: FlutterEngine) {
        super.configureFlutterEngine(flutterEngine)
        MethodChannel(flutterEngine.dartExecutor.binaryMessenger, CHANNEL_NAME).setMethodCallHandler { call, result ->
            when (call.method) {
                "requestPermission" -> {
                    val granted = requestNativeNotificationPermission()
                    result.success(granted)
                }
                "checkPermission" -> {
                    result.success(isNotificationPermissionGranted())
                }
                "showNotification" -> {
                    val id = call.argument<Int>("id") ?: ((System.currentTimeMillis() % 100000).toInt())
                    val name = call.argument<String>("name") ?: "Customer"
                    val phone = call.argument<String>("phone") ?: ""
                    val service = call.argument<String>("service") ?: "Painting Service"
                    val area = call.argument<String>("area") ?: "Bangalore"
                    val notes = call.argument<String>("notes") ?: ""
                    showSystemNotification(id, name, phone, service, area, notes)
                    result.success(true)
                }
                else -> result.notImplemented()
            }
        }
    }

    private fun createNotificationChannel() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            val soundUri = RingtoneManager.getDefaultUri(RingtoneManager.TYPE_NOTIFICATION)
            val audioAttributes = AudioAttributes.Builder()
                .setContentType(AudioAttributes.CONTENT_TYPE_SONIFICATION)
                .setUsage(AudioAttributes.USAGE_NOTIFICATION_COMMUNICATION_INSTANT)
                .build()

            val channel = NotificationChannel(
                NOTIF_CHANNEL_ID,
                "Royal Home Painting Leads",
                NotificationManager.IMPORTANCE_HIGH
            ).apply {
                description = "Instant alerts when customers submit leads on your website"
                enableLights(true)
                lightColor = Color.parseColor("#F0620D")
                enableVibration(true)
                vibrationPattern = longArrayOf(0, 400, 200, 400, 200, 600)
                setSound(soundUri, audioAttributes)
            }

            val manager = getSystemService(Context.NOTIFICATION_SERVICE) as? NotificationManager
            manager?.createNotificationChannel(channel)
        }
    }

    private fun isNotificationPermissionGranted(): Boolean {
        return if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) {
            checkSelfPermission(Manifest.permission.POST_NOTIFICATIONS) == PackageManager.PERMISSION_GRANTED
        } else {
            val manager = getSystemService(Context.NOTIFICATION_SERVICE) as? NotificationManager
            manager?.areNotificationsEnabled() ?: true
        }
    }

    private fun requestNativeNotificationPermission(): Boolean {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) {
            if (checkSelfPermission(Manifest.permission.POST_NOTIFICATIONS) != PackageManager.PERMISSION_GRANTED) {
                requestPermissions(
                    arrayOf(Manifest.permission.POST_NOTIFICATIONS),
                    NOTIF_PERMISSION_REQ_CODE
                )
                return false
            }
        }
        return true
    }

    private fun showSystemNotification(
        id: Int,
        name: String,
        phone: String,
        service: String,
        area: String,
        notes: String
    ) {
        val manager = getSystemService(Context.NOTIFICATION_SERVICE) as? NotificationManager ?: return

        // PendingIntent to launch/bring forward the app
        val openIntent = packageManager.getLaunchIntentForPackage(packageName)?.apply {
            flags = Intent.FLAG_ACTIVITY_SINGLE_TOP or Intent.FLAG_ACTIVITY_CLEAR_TOP
        }
        val pendingIntentFlags = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
            PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
        } else {
            PendingIntent.FLAG_UPDATE_CURRENT
        }
        val openPendingIntent = PendingIntent.getActivity(this, id, openIntent, pendingIntentFlags)

        val builder = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            Notification.Builder(this, NOTIF_CHANNEL_ID)
        } else {
            @Suppress("DEPRECATION")
            Notification.Builder(this)
        }

        val bigText = "👤 Customer: $name\n📞 Phone: $phone\n📍 Area: $area\n🛠 Service: $service" +
                if (notes.isNotBlank()) "\n💬 Notes: $notes" else ""

        builder.setSmallIcon(R.mipmap.ic_launcher)
            .setContentTitle("🚨 NEW LEAD: $name")
            .setContentText("$service in $area ($phone)")
            .setStyle(Notification.BigTextStyle().bigText(bigText))
            .setAutoCancel(true)
            .setContentIntent(openPendingIntent)

        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.LOLLIPOP) {
            builder.setColor(Color.parseColor("#F0620D"))
            builder.setPriority(Notification.PRIORITY_MAX)
        }

        // Action: Call
        if (phone.isNotBlank()) {
            val callIntent = Intent(Intent.ACTION_DIAL, Uri.parse("tel:$phone"))
            val callPendingIntent = PendingIntent.getActivity(this, id + 1, callIntent, pendingIntentFlags)
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.KITKAT_WATCH) {
                val callAction = Notification.Action.Builder(
                    android.R.drawable.ic_menu_call,
                    "Call",
                    callPendingIntent
                ).build()
                builder.addAction(callAction)
            }

            // Action: WhatsApp
            val cleanDigits = phone.replace(Regex("[^0-9]"), "")
            val waPhone = if (cleanDigits.length == 10) "91$cleanDigits" else cleanDigits
            val waText = Uri.encode("Hi $name, thank you for contacting Royal Home Painting regarding your $service inquiry in $area. When can we visit for inspection?")
            val waIntent = Intent(Intent.ACTION_VIEW, Uri.parse("https://wa.me/$waPhone?text=$waText"))
            val waPendingIntent = PendingIntent.getActivity(this, id + 2, waIntent, pendingIntentFlags)
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.KITKAT_WATCH) {
                val waAction = Notification.Action.Builder(
                    android.R.drawable.ic_menu_send,
                    "WhatsApp",
                    waPendingIntent
                ).build()
                builder.addAction(waAction)
            }
        }

        if (Build.VERSION.SDK_INT < Build.VERSION_CODES.TIRAMISU ||
            checkSelfPermission(Manifest.permission.POST_NOTIFICATIONS) == PackageManager.PERMISSION_GRANTED
        ) {
            manager.notify(id, builder.build())
        }
    }
}
