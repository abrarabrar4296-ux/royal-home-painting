import 'dart:async';
import 'dart:convert';
import 'dart:io';

import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:webview_flutter/webview_flutter.dart';
import 'package:url_launcher/url_launcher.dart';

void main() {
  WidgetsFlutterBinding.ensureInitialized();
  SystemChrome.setSystemUIOverlayStyle(
    const SystemUiOverlayStyle(
      statusBarColor: Color(0xFFF0620D),
      statusBarIconBrightness: Brightness.light,
    ),
  );
  runApp(const RoyalHomePaintingApp());
}

class RoyalHomePaintingApp extends StatelessWidget {
  const RoyalHomePaintingApp({super.key});

  @override
  Widget build(BuildContext context) {
    return MaterialApp(
      title: 'Royal Home Painting',
      debugShowCheckedModeBanner: false,
      theme: ThemeData(
        primaryColor: const Color(0xFFF0620D),
        colorScheme: ColorScheme.fromSeed(
          seedColor: const Color(0xFFF0620D),
          primary: const Color(0xFFF0620D),
        ),
        useMaterial3: true,
      ),
      home: const WebViewScreen(),
    );
  }
}

class WebViewScreen extends StatefulWidget {
  const WebViewScreen({super.key});

  @override
  State<WebViewScreen> createState() => _WebViewScreenState();
}

class _WebViewScreenState extends State<WebViewScreen> {
  late final WebViewController _controller;
  int _progress = 0;
  bool _isLoading = true;
  bool _hasError = false;

  final String _initialUrl = 'https://royal-home-painting.vercel.app/leads.html';

  static const MethodChannel _notifChannel =
      MethodChannel('com.royalhomepainting.app/notifications');

  Timer? _leadPollTimer;
  final Set<int> _knownLeadIds = {};
  bool _isFirstPoll = true;

  @override
  void initState() {
    super.initState();
    _requestNativeNotificationPermission();
    _initWebView();
    _startLeadMonitoring();
  }

  Future<void> _requestNativeNotificationPermission() async {
    try {
      await _notifChannel.invokeMethod('requestPermission');
    } catch (_) {}
  }

  @override
  void dispose() {
    _leadPollTimer?.cancel();
    super.dispose();
  }

  void _startLeadMonitoring() {
    // Independent background poll so mobile phone receives alerts even if WebView is idle
    _checkNewLeads();
    _leadPollTimer = Timer.periodic(const Duration(seconds: 8), (_) {
      _checkNewLeads();
    });
  }

  Future<void> _checkNewLeads() async {
    try {
      final client = HttpClient();
      client.connectionTimeout = const Duration(seconds: 6);
      final request = await client.getUrl(
        Uri.parse('https://royal-home-painting.vercel.app/api/leads'),
      );
      final response = await request.close();
      if (response.statusCode == 200) {
        final body = await response.transform(utf8.decoder).join();
        final data = jsonDecode(body);
        if (data['success'] == true && data['leads'] is List) {
          final List leads = data['leads'];
          if (_isFirstPoll) {
            for (final l in leads) {
              if (l['id'] != null) {
                _knownLeadIds.add(l['id'] as int);
              }
            }
            _isFirstPoll = false;
          } else {
            for (final l in leads) {
              final id = l['id'] as int?;
              if (id != null && !_knownLeadIds.contains(id)) {
                _knownLeadIds.add(id);
                _notifyLead(
                  name: l['name']?.toString() ?? 'Customer',
                  phone: l['phone']?.toString() ?? '',
                  service: l['service']?.toString() ?? 'Painting Service',
                  area: l['area']?.toString() ?? 'Bangalore',
                  notes: l['notes']?.toString() ?? '',
                );
              }
            }
          }
        }
      }
      client.close();
    } catch (_) {}
  }

  void _notifyLead({
    required String name,
    required String phone,
    required String service,
    required String area,
    required String notes,
  }) {
    // 1. Post real system notification to Android status bar / lock screen
    try {
      _notifChannel.invokeMethod('showNotification', {
        'id': DateTime.now().millisecondsSinceEpoch % 100000,
        'name': name,
        'phone': phone,
        'service': service,
        'area': area,
        'notes': notes,
      });
    } catch (_) {}

    // 2. Sound alert & vibration on mobile device
    SystemSound.play(SystemSoundType.alert);
    HapticFeedback.heavyImpact();
    Future.delayed(const Duration(milliseconds: 300), () {
      HapticFeedback.heavyImpact();
      SystemSound.play(SystemSoundType.alert);
    });

    if (!mounted) return;

    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.transparent,
      builder: (ctx) {
        final cleanPhone = phone.replaceAll(RegExp(r'\D'), '');
        final waPhone = cleanPhone.length == 10 ? '91$cleanPhone' : cleanPhone;
        final waMsg = 'Hi $name, thank you for contacting Royal Home Painting regarding your $service inquiry in $area. When can we visit for inspection?';
        final waAppUrl = 'whatsapp://send?phone=$waPhone&text=${Uri.encodeComponent(waMsg)}';
        final waWebUrl = 'https://api.whatsapp.com/send?phone=$waPhone&text=${Uri.encodeComponent(waMsg)}';

        return Container(
          decoration: const BoxDecoration(
            color: Color(0xFF1A1A1A),
            borderRadius: BorderRadius.vertical(top: Radius.circular(20)),
            border: Border(top: BorderSide(color: Color(0xFFF0620D), width: 4)),
          ),
          padding: const EdgeInsets.fromLTRB(20, 16, 20, 32),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Row(
                children: [
                  Container(
                    padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
                    decoration: BoxDecoration(
                      color: const Color(0xFFF0620D),
                      borderRadius: BorderRadius.circular(6),
                    ),
                    child: const Row(
                      mainAxisSize: MainAxisSize.min,
                      children: [
                        Icon(Icons.notifications_active, color: Colors.white, size: 16),
                        SizedBox(width: 6),
                        Text(
                          'NEW WEBSITE LEAD',
                          style: TextStyle(
                            color: Colors.white,
                            fontSize: 12,
                            fontWeight: FontWeight.bold,
                            letterSpacing: 0.8,
                          ),
                        ),
                      ],
                    ),
                  ),
                  const Spacer(),
                  IconButton(
                    icon: const Icon(Icons.close, color: Colors.white70),
                    onPressed: () => Navigator.pop(ctx),
                  ),
                ],
              ),
              const SizedBox(height: 12),
              Text(
                name,
                style: const TextStyle(
                  color: Colors.white,
                  fontSize: 22,
                  fontWeight: FontWeight.bold,
                ),
              ),
              const SizedBox(height: 6),
              Row(
                children: [
                  const Icon(Icons.location_on, color: Color(0xFFF0620D), size: 16),
                  const SizedBox(width: 4),
                  Text(
                    area,
                    style: const TextStyle(color: Colors.white70, fontSize: 14),
                  ),
                  const SizedBox(width: 12),
                  const Icon(Icons.format_paint, color: Color(0xFFF0620D), size: 16),
                  const SizedBox(width: 4),
                  Expanded(
                    child: Text(
                      service,
                      style: const TextStyle(color: Colors.white70, fontSize: 14),
                      overflow: TextOverflow.ellipsis,
                    ),
                  ),
                ],
              ),
              const SizedBox(height: 10),
              Container(
                width: double.infinity,
                padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
                decoration: BoxDecoration(
                  color: Colors.black45,
                  borderRadius: BorderRadius.circular(8),
                ),
                child: Text(
                  'Phone: $phone',
                  style: const TextStyle(
                    color: Color(0xFFFFB74D),
                    fontSize: 15,
                    fontWeight: FontWeight.w600,
                  ),
                ),
              ),
              if (notes.isNotEmpty) ...[
                const SizedBox(height: 8),
                Text(
                  '"$notes"',
                  style: const TextStyle(
                    color: Colors.white54,
                    fontSize: 13,
                    fontStyle: FontStyle.italic,
                  ),
                ),
              ],
              const SizedBox(height: 18),
              Row(
                children: [
                  Expanded(
                    child: ElevatedButton.icon(
                      style: ElevatedButton.styleFrom(
                        backgroundColor: const Color(0xFF28A745),
                        foregroundColor: Colors.white,
                        padding: const EdgeInsets.symmetric(vertical: 12),
                        shape: RoundedRectangleBorder(
                          borderRadius: BorderRadius.circular(8),
                        ),
                      ),
                      onPressed: () async {
                        final uri = Uri.parse('tel:$phone');
                        if (await canLaunchUrl(uri)) {
                          await launchUrl(uri);
                        }
                      },
                      icon: const Icon(Icons.call, size: 18),
                      label: const Text('Call Now', style: TextStyle(fontWeight: FontWeight.bold)),
                    ),
                  ),
                  const SizedBox(width: 10),
                  Expanded(
                    child: ElevatedButton.icon(
                      style: ElevatedButton.styleFrom(
                        backgroundColor: const Color(0xFF25D366),
                        foregroundColor: Colors.white,
                        padding: const EdgeInsets.symmetric(vertical: 12),
                        shape: RoundedRectangleBorder(
                          borderRadius: BorderRadius.circular(8),
                        ),
                      ),
                      onPressed: () async {
                        final appUri = Uri.parse(waAppUrl);
                        final webUri = Uri.parse(waWebUrl);
                        if (await canLaunchUrl(appUri)) {
                          await launchUrl(appUri, mode: LaunchMode.externalApplication);
                        } else if (await canLaunchUrl(webUri)) {
                          await launchUrl(webUri, mode: LaunchMode.externalApplication);
                        }
                      },
                      icon: const Icon(Icons.chat, size: 18),
                      label: const Text('WhatsApp', style: TextStyle(fontWeight: FontWeight.bold)),
                    ),
                  ),
                ],
              ),
            ],
          ),
        );
      },
    );
  }

  void _initWebView() {
    _controller = WebViewController()
      ..setJavaScriptMode(JavaScriptMode.unrestricted)
      ..setBackgroundColor(Colors.white)
      ..addJavaScriptChannel(
        'LeadNotificationChannel',
        onMessageReceived: (JavaScriptMessage message) {
          try {
            final data = jsonDecode(message.message);
            _notifyLead(
              name: data['name']?.toString() ?? 'Customer',
              phone: data['phone']?.toString() ?? '',
              service: data['service']?.toString() ?? 'Painting Service',
              area: data['area']?.toString() ?? 'Bangalore',
              notes: data['notes']?.toString() ?? '',
            );
          } catch (_) {}
        },
      )
      ..setNavigationDelegate(
        NavigationDelegate(
          onProgress: (int progress) {
            setState(() {
              _progress = progress;
              _isLoading = progress < 100;
            });
          },
          onPageStarted: (String url) {
            setState(() {
              _isLoading = true;
              _hasError = false;
            });
          },
          onPageFinished: (String url) {
            setState(() {
              _isLoading = false;
            });
            _controller.runJavaScript('''
              window.__IS_NATIVE_APP__ = true;
              const banner = document.getElementById('mobile-alert-banner');
              if (banner) {
                banner.style.display = 'none';
              }
              const notifBtn = document.getElementById('btn-notif-toggle');
              if (notifBtn) {
                notifBtn.innerHTML = '🔔 App Alerts: Active';
                notifBtn.className = 'btn-dash btn-dash-notif active';
                notifBtn.title = 'Native notifications are active on this device.';
              }
            ''');
          },
          onWebResourceError: (WebResourceError error) {
            if (error.isForMainFrame ?? true) {
              setState(() {
                _hasError = true;
                _isLoading = false;
              });
            }
          },
          onNavigationRequest: (NavigationRequest request) async {
            final url = request.url;

            // 1. Handle Instagram natively (opens Instagram app or external browser)
            if (url.contains('instagram.com') || url.startsWith('instagram://')) {
              final igAppUri = Uri.parse('instagram://user?username=royalhomepainting11');
              final igWebUri = Uri.parse('https://www.instagram.com/royalhomepainting11/');
              if (await canLaunchUrl(igAppUri)) {
                await launchUrl(igAppUri, mode: LaunchMode.externalApplication);
              } else if (await canLaunchUrl(igWebUri)) {
                await launchUrl(igWebUri, mode: LaunchMode.externalApplication);
              }
              return NavigationDecision.prevent;
            }

            // 2. Handle WhatsApp, Tel, and Mailto intents natively
            if (url.startsWith('https://wa.me') ||
                url.startsWith('https://api.whatsapp.com') ||
                url.startsWith('whatsapp://') ||
                url.startsWith('tel:') ||
                url.startsWith('mailto:')) {
              if (url.contains('whatsapp') || url.contains('wa.me')) {
                final parsed = Uri.parse(url);
                String? phone = parsed.queryParameters['phone'];
                if (phone == null && url.contains('wa.me/')) {
                  final seg = parsed.pathSegments;
                  if (seg.isNotEmpty) phone = seg.last;
                }
                final text = parsed.queryParameters['text'] ?? '';
                final cleanPhone = (phone ?? '919740318779').replaceAll(RegExp(r'\D'), '');
                final nativeAppUri = Uri.parse(
                  'whatsapp://send?phone=$cleanPhone&text=${Uri.encodeComponent(text)}',
                );
                if (await canLaunchUrl(nativeAppUri)) {
                  await launchUrl(nativeAppUri, mode: LaunchMode.externalApplication);
                  return NavigationDecision.prevent;
                }
              }

              final uri = Uri.parse(url);
              if (await canLaunchUrl(uri)) {
                await launchUrl(uri, mode: LaunchMode.externalApplication);
                return NavigationDecision.prevent;
              }
            }

            // Handle file downloads externally so Android's native download manager/browser handles them
            if (url.endsWith('.xlsx') ||
                url.endsWith('.csv') ||
                url.endsWith('.zip') ||
                url.endsWith('.apk') ||
                url.contains('/export-excel') ||
                url.contains('/api/leads.csv') ||
                url.contains('/downloads/')) {
              final uri = Uri.parse(url);
              if (await canLaunchUrl(uri)) {
                await launchUrl(uri, mode: LaunchMode.externalApplication);
                return NavigationDecision.prevent;
              }
            }
            return NavigationDecision.navigate;
          },
        ),
      )
      ..loadRequest(Uri.parse(_initialUrl));
  }

  @override
  Widget build(BuildContext context) {
    return PopScope(
      canPop: false,
      onPopInvokedWithResult: (didPop, result) async {
        if (didPop) return;
        if (await _controller.canGoBack()) {
          await _controller.goBack();
        } else {
          SystemNavigator.pop();
        }
      },
      child: Scaffold(
        backgroundColor: Colors.white,
        body: SafeArea(
          child: Stack(
            children: [
              if (!_hasError)
                RefreshIndicator(
                  color: const Color(0xFFF0620D),
                  onRefresh: () async {
                    await _controller.reload();
                  },
                  child: WebViewWidget(controller: _controller),
                ),
              if (_isLoading && !_hasError)
                LinearProgressIndicator(
                  value: _progress / 100.0,
                  backgroundColor: Colors.transparent,
                  valueColor: const AlwaysStoppedAnimation<Color>(
                    Color(0xFFF0620D),
                  ),
                ),
              if (_hasError)
                Center(
                  child: Padding(
                    padding: const EdgeInsets.all(24.0),
                    child: Column(
                      mainAxisAlignment: MainAxisAlignment.center,
                      children: [
                        const Icon(
                          Icons.signal_wifi_off_rounded,
                          size: 64,
                          color: Color(0xFFF0620D),
                        ),
                        const SizedBox(height: 16),
                        const Text(
                          'Connection Error',
                          style: TextStyle(
                            fontSize: 20,
                            fontWeight: FontWeight.bold,
                          ),
                        ),
                        const SizedBox(height: 8),
                        const Text(
                          'Unable to load Royal Home Painting. Please check your internet connection.',
                          textAlign: TextAlign.center,
                          style: TextStyle(color: Colors.grey),
                        ),
                        const SizedBox(height: 24),
                        ElevatedButton.icon(
                          onPressed: () {
                            setState(() {
                              _hasError = false;
                              _isLoading = true;
                            });
                            _controller.reload();
                          },
                          icon: const Icon(Icons.refresh),
                          label: const Text('Retry'),
                          style: ElevatedButton.styleFrom(
                            backgroundColor: const Color(0xFFF0620D),
                            foregroundColor: Colors.white,
                            padding: const EdgeInsets.symmetric(
                              horizontal: 24,
                              vertical: 12,
                            ),
                          ),
                        ),
                      ],
                    ),
                  ),
                ),
            ],
          ),
        ),
      ),
    );
  }
}
