package com.benmi.pos;

import android.graphics.Bitmap;
import android.graphics.Color;
import java.io.ByteArrayOutputStream;
import java.nio.charset.StandardCharsets;

/**
 * TsplBitmapConverter
 * Converts standard Android Bitmaps into 1-bit Monochrome TSPL (Taiwan Semiconductor Printing Language)
 * command streams for thermal label, sticker, and waybill printers (e.g. Aimo D520BT, Xprinter XP-365B, Phomemo, Munbyn).
 */
public class TsplBitmapConverter {

    /**
     * Converts a Bitmap into a TSPL raster byte array.
     *
     * @param bitmap Original Android Bitmap (Label canvas)
     * @param widthMm Physical label width in mm (e.g. 100, 76, 50)
     * @param heightMm Physical label height in mm (e.g. 150, 130, 30)
     * @return TSPL binary byte array ready to be sent over Bluetooth RFCOMM or TCP socket
     */
    public static byte[] convertBitmapToTsplRaster(Bitmap bitmap, int widthMm, int heightMm) {
        if (bitmap == null) {
            return new byte[0];
        }

        // Standard 203 DPI thermal label printer resolution = 8 dots per mm
        int targetWidth = Math.max(8, widthMm * 8);
        int targetHeight = Math.max(8, heightMm * 8);

        Bitmap scaledBitmap = Bitmap.createScaledBitmap(bitmap, targetWidth, targetHeight, true);
        int widthBytes = (targetWidth + 7) / 8;
        int heightPixels = targetHeight;

        ByteArrayOutputStream stream = new ByteArrayOutputStream();
        try {
            // 1. Label dimensions: SIZE {width} mm, {height} mm
            String header = String.format("SIZE %d mm, %d mm\r\n", widthMm, heightMm);
            header += "GAP 2 mm, 0 mm\r\n";
            header += "DIRECTION 1\r\n";
            header += "CLS\r\n";
            // BITMAP X, Y, width_bytes, height_dots, mode, bitmap_data
            header += String.format("BITMAP 0, 0, %d, %d, 0, ", widthBytes, heightPixels);

            stream.write(header.getBytes(StandardCharsets.US_ASCII));

            // 2. 1-bit Monochrome Pixel packing (Mode 0: 1 = Black dot, 0 = White)
            final int threshold = 175;
            for (int y = 0; y < targetHeight; y++) {
                for (int xByte = 0; xByte < widthBytes; xByte++) {
                    byte b = 0;
                    for (int bit = 0; bit < 8; bit++) {
                        int x = xByte * 8 + bit;
                        if (x < targetWidth) {
                            int pixel = scaledBitmap.getPixel(x, y);
                            int alpha = Color.alpha(pixel);
                            if (alpha > 128) {
                                int r = Color.red(pixel);
                                int g = Color.green(pixel);
                                int bVal = Color.blue(pixel);
                                int luminance = (int) (0.299 * r + 0.587 * g + 0.114 * bVal);
                                if (luminance < threshold) {
                                    b |= (byte) (1 << (7 - bit));
                                }
                            }
                        }
                    }
                    stream.write(b);
                }
            }

            // 3. Print command: PRINT 1, 1 (Print 1 label copy)
            String footer = "\r\nPRINT 1, 1\r\n";
            stream.write(footer.getBytes(StandardCharsets.US_ASCII));

        } catch (Exception e) {
            e.printStackTrace();
        }

        return stream.toByteArray();
    }
}
