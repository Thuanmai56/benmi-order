package com.benmi.pos;

import android.Manifest;
import android.bluetooth.BluetoothAdapter;
import android.bluetooth.BluetoothDevice;
import android.bluetooth.BluetoothSocket;
import android.content.pm.PackageManager;
import android.graphics.Bitmap;
import android.graphics.BitmapFactory;
import android.os.Build;
import android.util.Base64;
import androidx.core.app.ActivityCompat;
import com.getcapacitor.JSArray;
import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;
import com.getcapacitor.annotation.Permission;

import java.io.OutputStream;
import java.net.InetSocketAddress;
import java.net.Socket;
import java.util.Set;
import java.util.UUID;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;

/**
 * ThermalPrinterPlugin
 * Native Capacitor Plugin for direct, silent ESC/POS thermal printing over local TCP Sockets (Port 9100)
 * and Bluetooth Classic Serial Port Profile (SPP RFCOMM).
 */
@CapacitorPlugin(
    name = "ThermalPrinter",
    permissions = {
        @Permission(strings = { Manifest.permission.BLUETOOTH_CONNECT, Manifest.permission.BLUETOOTH_SCAN }, alias = "bluetooth")
    }
)
public class ThermalPrinterPlugin extends Plugin {
    private final ExecutorService executor = Executors.newFixedThreadPool(3);
    private static final UUID SPP_UUID = UUID.fromString("00001101-0000-1000-8000-00805F9B34FB");

    /**
     * Send raw ESC/POS byte data over TCP socket.
     * Arguments:
     * - ip: string (Printer IP address, e.g. "192.168.1.100")
     * - port: int (default: 9100)
     * - data: string (Base64 encoded ESC/POS byte stream)
     * - timeoutMs: int (Socket timeout in milliseconds, default: 4000)
     */
    @PluginMethod
    public void printTcp(PluginCall call) {
        String ip = call.getString("ip");
        Integer port = call.getInt("port", 9100);
        String base64Data = call.getString("data");
        Integer timeoutMs = call.getInt("timeoutMs", 4000);

        if (ip == null || ip.trim().isEmpty() || base64Data == null || base64Data.trim().isEmpty()) {
            call.reject("IP address and base64 print data are required.");
            return;
        }

        executor.execute(() -> {
            Socket socket = null;
            try {
                byte[] rawBytes = Base64.decode(base64Data, Base64.DEFAULT);
                socket = new Socket();
                socket.connect(new InetSocketAddress(ip.trim(), port), timeoutMs);
                socket.setSoTimeout(timeoutMs);

                OutputStream outputStream = socket.getOutputStream();
                outputStream.write(rawBytes);
                outputStream.flush();

                JSObject ret = new JSObject();
                ret.put("success", true);
                ret.put("ip", ip);
                ret.put("bytesWritten", rawBytes.length);
                call.resolve(ret);
            } catch (Exception e) {
                call.reject("Failed to print to " + ip + ":" + port + " - " + e.getMessage(), e);
            } finally {
                if (socket != null) {
                    try { socket.close(); } catch (Exception ignored) {}
                }
            }
        });
    }

    /**
     * Convert and print an HTML canvas / base64 image as 1-bit monochrome raster bitmap (GS v 0).
     * Arguments:
     * - ip: string (Printer IP address)
     * - port: int (default: 9100)
     * - base64Image: string (Base64 encoded PNG or JPEG image)
     * - paperWidth: int (80 or 58, default: 80)
     * - autoCut: boolean (default: true)
     * - timeoutMs: int (default: 5000)
     */
    @PluginMethod
    public void printBitmap(PluginCall call) {
        String ip = call.getString("ip");
        Integer port = call.getInt("port", 9100);
        String base64Image = call.getString("base64Image");
        Integer paperWidth = call.getInt("paperWidth", 80);
        Boolean autoCut = call.getBoolean("autoCut", true);
        Integer timeoutMs = call.getInt("timeoutMs", 5000);

        if (ip == null || ip.trim().isEmpty() || base64Image == null || base64Image.trim().isEmpty()) {
            call.reject("IP address and base64 image data are required.");
            return;
        }

        executor.execute(() -> {
            Socket socket = null;
            try {
                String cleanBase64 = base64Image;
                if (cleanBase64.contains(",")) {
                    cleanBase64 = cleanBase64.split(",")[1];
                }
                byte[] decodedString = Base64.decode(cleanBase64, Base64.DEFAULT);
                Bitmap decodedBitmap = BitmapFactory.decodeByteArray(decodedString, 0, decodedString.length);
                if (decodedBitmap == null) {
                    call.reject("Failed to decode base64 image into Bitmap.");
                    return;
                }

                byte[] escPosBytes = EscPosBitmapConverter.convertBitmapToEscPosRaster(decodedBitmap, paperWidth, autoCut);

                socket = new Socket();
                socket.connect(new InetSocketAddress(ip.trim(), port), timeoutMs);
                socket.setSoTimeout(timeoutMs);

                OutputStream outputStream = socket.getOutputStream();
                outputStream.write(escPosBytes);
                outputStream.flush();

                JSObject ret = new JSObject();
                ret.put("success", true);
                ret.put("ip", ip);
                ret.put("bytesWritten", escPosBytes.length);
                call.resolve(ret);
            } catch (Exception e) {
                call.reject("Failed to print bitmap to " + ip + ":" + port + " - " + e.getMessage(), e);
            } finally {
                if (socket != null) {
                    try { socket.close(); } catch (Exception ignored) {}
                }
            }
        });
    }

    /**
     * Convert and print an HTML snippet directly using Native Android WebView rendering into 1-bit ESC/POS bitmap.
     * This avoids any Chromium Canvas Tainting / SecurityError restrictions.
     */
    @PluginMethod
    public void printHtml(PluginCall call) {
        String ip = call.getString("ip");
        Integer port = call.getInt("port", 9100);
        String html = call.getString("html");
        Integer paperWidth = call.getInt("paperWidth", 80);
        Boolean autoCut = call.getBoolean("autoCut", true);
        Integer timeoutMs = call.getInt("timeoutMs", 5000);

        if (ip == null || ip.trim().isEmpty() || html == null || html.trim().isEmpty()) {
            call.reject("IP address and HTML content are required.");
            return;
        }

        final int targetWidthPx = (paperWidth == 58) ? 384 : 576;

        getActivity().runOnUiThread(() -> {
            try {
                android.webkit.WebView renderWebView = new android.webkit.WebView(getContext());
                renderWebView.getSettings().setJavaScriptEnabled(true);
                renderWebView.getSettings().setDefaultTextEncodingName("UTF-8");
                renderWebView.setLayerType(android.view.View.LAYER_TYPE_SOFTWARE, null);

                renderWebView.setWebViewClient(new android.webkit.WebViewClient() {
                    @Override
                    public void onPageFinished(android.webkit.WebView view, String url) {
                        // Delay slightly to ensure fonts & layout are completely rasterized
                        view.postDelayed(() -> {
                            try {
                                float scale = getContext().getResources().getDisplayMetrics().density;
                                int contentHeight = Math.max(300, (int) (view.getContentHeight() * scale));
                                
                                view.measure(
                                    android.view.View.MeasureSpec.makeMeasureSpec(targetWidthPx, android.view.View.MeasureSpec.EXACTLY),
                                    android.view.View.MeasureSpec.makeMeasureSpec(contentHeight, android.view.View.MeasureSpec.EXACTLY)
                                );
                                view.layout(0, 0, targetWidthPx, contentHeight);

                                Bitmap bitmap = Bitmap.createBitmap(targetWidthPx, contentHeight, Bitmap.Config.ARGB_8888);
                                android.graphics.Canvas canvas = new android.graphics.Canvas(bitmap);
                                canvas.drawColor(android.graphics.Color.WHITE);
                                view.draw(canvas);

                                executor.execute(() -> {
                                    Socket socket = null;
                                    try {
                                        byte[] escPosBytes = EscPosBitmapConverter.convertBitmapToEscPosRaster(bitmap, paperWidth, autoCut);

                                        socket = new Socket();
                                        socket.connect(new InetSocketAddress(ip.trim(), port), timeoutMs);
                                        socket.setSoTimeout(timeoutMs);

                                        OutputStream outputStream = socket.getOutputStream();
                                        outputStream.write(escPosBytes);
                                        outputStream.flush();

                                        JSObject ret = new JSObject();
                                        ret.put("success", true);
                                        ret.put("ip", ip);
                                        ret.put("bytesWritten", escPosBytes.length);
                                        call.resolve(ret);
                                    } catch (Exception e) {
                                        call.reject("Failed to print HTML to " + ip + ":" + port + " - " + e.getMessage(), e);
                                    } finally {
                                        if (socket != null) {
                                            try { socket.close(); } catch (Exception ignored) {}
                                        }
                                    }
                                });
                            } catch (Exception e) {
                                call.reject("Failed to capture rendered receipt: " + e.getMessage(), e);
                            }
                        }, 250);
                    }
                });

                String styledHtml = "<!DOCTYPE html><html><head><meta charset='UTF-8'>" +
                    "<meta name='viewport' content='width=" + targetWidthPx + ", initial-scale=1.0, maximum-scale=1.0, user-scalable=no'>" +
                    "<style>" +
                    "body { margin: 0; padding: 0; background: #ffffff !important; color: #000000 !important; font-family: sans-serif; } " +
                    "* { box-sizing: border-box; color: #000000 !important; border-color: #000000 !important; }" +
                    "</style>" +
                    "</head><body><div style='width:" + targetWidthPx + "px; background:#ffffff; color:#000000; padding: 8px;'>" + html + "</div></body></html>";

                renderWebView.loadDataWithBaseURL("https://localhost", styledHtml, "text/html", "UTF-8", null);
            } catch (Exception e) {
                call.reject("Failed to initialize HTML rendering: " + e.getMessage(), e);
            }
        });
    }

    /**
     * Test network connection to a thermal printer IP and Port.
     * Arguments:
     * - ip: string (Printer IP)
     * - port: int (default: 9100)
     * - timeoutMs: int (default: 2000)
     */
    @PluginMethod
    public void testConnection(PluginCall call) {
        String ip = call.getString("ip");
        Integer port = call.getInt("port", 9100);
        Integer timeoutMs = call.getInt("timeoutMs", 2000);

        if (ip == null || ip.trim().isEmpty()) {
            call.reject("Printer IP is required.");
            return;
        }

        executor.execute(() -> {
            Socket socket = null;
            try {
                socket = new Socket();
                socket.connect(new InetSocketAddress(ip.trim(), port), timeoutMs);
                JSObject ret = new JSObject();
                ret.put("success", true);
                ret.put("ip", ip);
                ret.put("port", port);
                call.resolve(ret);
            } catch (Exception e) {
                call.reject("Connection failed to " + ip + ":" + port + " - " + e.getMessage(), e);
            } finally {
                if (socket != null) {
                    try { socket.close(); } catch (Exception ignored) {}
                }
            }
        });
    }

    /**
     * Retrieve list of bonded/paired Bluetooth devices on Android OS.
     * Returns:
     * - supported: boolean
     * - enabled: boolean
     * - devices: Array<{ name: string, address: string, type: int }>
     */
    @PluginMethod
    public void getPairedBluetoothDevices(PluginCall call) {
        try {
            BluetoothAdapter adapter = BluetoothAdapter.getDefaultAdapter();
            JSObject ret = new JSObject();

            if (adapter == null) {
                ret.put("supported", false);
                ret.put("enabled", false);
                ret.put("devices", new JSArray());
                call.resolve(ret);
                return;
            }

            ret.put("supported", true);
            ret.put("enabled", adapter.isEnabled());

            if (!adapter.isEnabled()) {
                ret.put("devices", new JSArray());
                call.resolve(ret);
                return;
            }

            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S) {
                if (ActivityCompat.checkSelfPermission(getContext(), Manifest.permission.BLUETOOTH_CONNECT) != PackageManager.PERMISSION_GRANTED) {
                    call.reject("BLUETOOTH_CONNECT permission not granted. Please grant Bluetooth permissions in Settings.");
                    return;
                }
            }

            Set<BluetoothDevice> paired = adapter.getBondedDevices();
            JSArray devicesArray = new JSArray();

            if (paired != null) {
                for (BluetoothDevice device : paired) {
                    JSObject devObj = new JSObject();
                    String devName = device.getName();
                    devObj.put("name", devName != null ? devName : "Unknown Device");
                    devObj.put("address", device.getAddress());
                    devObj.put("type", device.getType());
                    devicesArray.put(devObj);
                }
            }

            ret.put("devices", devicesArray);
            call.resolve(ret);
        } catch (Exception e) {
            call.reject("Failed to query paired Bluetooth devices: " + e.getMessage(), e);
        }
    }

    /**
     * Print raw data or raster bitmap to a Bluetooth Classic printer (SPP RFCOMM).
     * Arguments:
     * - macAddress: string (e.g. "00:11:22:33:44:55")
     * - base64Image: string (optional PNG base64)
     * - data: string (optional raw base64 byte stream)
     * - paperWidth: int (80 or 58, default: 80)
     * - autoCut: boolean (default: true)
     */
    @PluginMethod
    public void printBluetooth(PluginCall call) {
        String macAddress = call.getString("macAddress");
        String base64Image = call.getString("base64Image");
        String base64Data = call.getString("data");
        Integer paperWidth = call.getInt("paperWidth", 80);
        Boolean autoCut = call.getBoolean("autoCut", true);

        if (macAddress == null || macAddress.trim().isEmpty()) {
            call.reject("Bluetooth device MAC address is required.");
            return;
        }

        if ((base64Image == null || base64Image.trim().isEmpty()) && (base64Data == null || base64Data.trim().isEmpty())) {
            call.reject("Either base64Image or base64 data must be provided.");
            return;
        }

        executor.execute(() -> {
            BluetoothSocket socket = null;
            try {
                BluetoothAdapter adapter = BluetoothAdapter.getDefaultAdapter();
                if (adapter == null || !adapter.isEnabled()) {
                    call.reject("Bluetooth adapter is not available or disabled.");
                    return;
                }

                if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S) {
                    if (ActivityCompat.checkSelfPermission(getContext(), Manifest.permission.BLUETOOTH_CONNECT) != PackageManager.PERMISSION_GRANTED) {
                        call.reject("BLUETOOTH_CONNECT permission not granted.");
                        return;
                    }
                }

                // Cancel active discovery to ensure maximum socket connection speed
                adapter.cancelDiscovery();

                BluetoothDevice device = adapter.getRemoteDevice(macAddress.trim().toUpperCase());
                if (device == null) {
                    call.reject("Bluetooth device not found for address: " + macAddress);
                    return;
                }

                // Prepare print payload
                byte[] printBytes;
                if (base64Image != null && !base64Image.trim().isEmpty()) {
                    String cleanBase64 = base64Image.contains(",") ? base64Image.substring(base64Image.indexOf(",") + 1) : base64Image;
                    byte[] imageBytes = Base64.decode(cleanBase64, Base64.DEFAULT);
                    Bitmap bitmap = BitmapFactory.decodeByteArray(imageBytes, 0, imageBytes.length);
                    if (bitmap == null) {
                        call.reject("Failed to decode base64 PNG bitmap.");
                        return;
                    }
                    printBytes = EscPosBitmapConverter.convertBitmapToEscPosRaster(bitmap, paperWidth, autoCut);
                } else {
                    printBytes = Base64.decode(base64Data, Base64.DEFAULT);
                }

                // Connect to SPP Socket (Standard UUID or reflection fallback)
                try {
                    socket = device.createRfcommSocketToServiceRecord(SPP_UUID);
                    socket.connect();
                } catch (Exception e1) {
                    try {
                        socket = (BluetoothSocket) device.getClass().getMethod("createRfcommSocket", new Class[]{int.class}).invoke(device, 1);
                        if (socket != null) {
                            socket.connect();
                        } else {
                            throw e1;
                        }
                    } catch (Exception e2) {
                        throw new Exception("Bluetooth RFCOMM connection failed to " + macAddress + " (" + e1.getMessage() + ")");
                    }
                }

                OutputStream outputStream = socket.getOutputStream();
                outputStream.write(printBytes);
                outputStream.flush();

                // Small delay to ensure printer hardware buffer completes before closing socket
                try { Thread.sleep(150); } catch (InterruptedException ignored) {}

                JSObject ret = new JSObject();
                ret.put("success", true);
                ret.put("macAddress", macAddress);
                ret.put("bytesWritten", printBytes.length);
                call.resolve(ret);
            } catch (Exception e) {
                call.reject("Bluetooth print failed to " + macAddress + " - " + e.getMessage(), e);
            } finally {
                if (socket != null) {
                    try { socket.close(); } catch (Exception ignored) {}
                }
            }
        });
    }

    /**
     * Test connection to a paired Bluetooth device.
     */
    @PluginMethod
    public void testBluetoothConnection(PluginCall call) {
        String macAddress = call.getString("macAddress");
        if (macAddress == null || macAddress.trim().isEmpty()) {
            call.reject("Bluetooth MAC address is required.");
            return;
        }

        executor.execute(() -> {
            BluetoothSocket socket = null;
            try {
                BluetoothAdapter adapter = BluetoothAdapter.getDefaultAdapter();
                if (adapter == null || !adapter.isEnabled()) {
                    call.reject("Bluetooth is disabled or not available.");
                    return;
                }

                if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S) {
                    if (ActivityCompat.checkSelfPermission(getContext(), Manifest.permission.BLUETOOTH_CONNECT) != PackageManager.PERMISSION_GRANTED) {
                        call.reject("BLUETOOTH_CONNECT permission not granted.");
                        return;
                    }
                }

                adapter.cancelDiscovery();
                BluetoothDevice device = adapter.getRemoteDevice(macAddress.trim().toUpperCase());

                try {
                    socket = device.createRfcommSocketToServiceRecord(SPP_UUID);
                    socket.connect();
                } catch (Exception e1) {
                    try {
                        socket = (BluetoothSocket) device.getClass().getMethod("createRfcommSocket", new Class[]{int.class}).invoke(device, 1);
                        if (socket != null) {
                            socket.connect();
                        } else {
                            throw e1;
                        }
                    } catch (Exception e2) {
                        throw new Exception("Bluetooth RFCOMM connection failed: " + e1.getMessage());
                    }
                }

                JSObject ret = new JSObject();
                ret.put("success", true);
                ret.put("macAddress", macAddress);
                ret.put("deviceName", device.getName());
                call.resolve(ret);
            } catch (Exception e) {
                call.reject("Bluetooth connection failed to " + macAddress + " - " + e.getMessage(), e);
            } finally {
                if (socket != null) {
                    try { socket.close(); } catch (Exception ignored) {}
                }
            }
        });
    }
}
