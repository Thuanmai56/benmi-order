package com.benmi.pos;

import android.graphics.Bitmap;
import android.graphics.BitmapFactory;
import android.util.Base64;
import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;

import java.io.OutputStream;
import java.net.InetSocketAddress;
import java.net.Socket;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;

/**
 * ThermalPrinterPlugin
 * Native Capacitor Plugin for direct, silent ESC/POS thermal printing over local TCP Sockets (Port 9100).
 */
@CapacitorPlugin(name = "ThermalPrinter")
public class ThermalPrinterPlugin extends Plugin {
    private final ExecutorService executor = Executors.newFixedThreadPool(3);

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
}
