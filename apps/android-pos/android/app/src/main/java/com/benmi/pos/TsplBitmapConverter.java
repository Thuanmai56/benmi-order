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
        return convertBitmapToTsplRaster(bitmap, widthMm, heightMm, 203, 0.0, 0.0);
    }

    /**
     * Converts a Bitmap into a TSPL raster byte array with configurable DPI and coordinate offsets.
     *
     * @param bitmap Original Android Bitmap (Label canvas)
     * @param widthMm Physical label width in mm (e.g. 40, 50, 76, 100)
     * @param heightMm Physical label height in mm (e.g. 30, 50, 130, 150)
     * @param dpi Printhead resolution (203 or 300 DPI)
     * @param xOffsetMm Horizontal offset in mm (shifts print left/right on center or misaligned trays)
     * @param yOffsetMm Vertical offset in mm (shifts print up/down)
     * @return TSPL binary byte array ready to be sent over Bluetooth RFCOMM or TCP socket
     */
    public static byte[] convertBitmapToTsplRaster(Bitmap bitmap, int widthMm, int heightMm, int dpi, double xOffsetMm, double yOffsetMm) {
        if (bitmap == null) {
            return new byte[0];
        }

        // Calculate resolution density: 203 DPI ≈ 8.0 dots/mm, 300 DPI ≈ 11.81 dots/mm
        float dotsPerMm = (dpi == 300) ? 11.811f : 8.0f;
        int targetWidth = Math.max(8, Math.round(widthMm * dotsPerMm));
        int targetHeight = Math.max(8, Math.round(heightMm * dotsPerMm));

        int xOffsetDots = Math.max(0, (int) Math.round(xOffsetMm * dotsPerMm));
        int yOffsetDots = Math.max(0, (int) Math.round(yOffsetMm * dotsPerMm));

        Bitmap scaledBitmap = Bitmap.createScaledBitmap(bitmap, targetWidth, targetHeight, true);
        int widthBytes = (targetWidth + 7) / 8;
        int heightPixels = targetHeight;

        ByteArrayOutputStream stream = new ByteArrayOutputStream();
        try {
            // 1. Label dimensions: SIZE {width} mm, {height} mm
            // Ensure SIZE accommodates any positive X/Y offset so printer doesn't clip buffer boundary
            int effectiveWidthMm = widthMm + (int) Math.max(0, Math.ceil(xOffsetMm));
            int effectiveHeightMm = heightMm + (int) Math.max(0, Math.ceil(yOffsetMm));

            String header = String.format("SIZE %d mm, %d mm\r\n", effectiveWidthMm, effectiveHeightMm);
            header += "GAP 2 mm, 0 mm\r\n";
            header += "DIRECTION 1\r\n";
            header += "CLS\r\n";
            // BITMAP X, Y, width_bytes, height_dots, mode, bitmap_data
            header += String.format("BITMAP %d, %d, %d, %d, 0, ", xOffsetDots, yOffsetDots, widthBytes, heightPixels);

            stream.write(header.getBytes(StandardCharsets.US_ASCII));

            // 2. 1-bit Monochrome Pixel packing (TSPL Mode 0 standard: 0 = Black dot/Print, 1 = White/No print)
            final int threshold = 175;
            for (int y = 0; y < targetHeight; y++) {
                for (int xByte = 0; xByte < widthBytes; xByte++) {
                    byte b = (byte) 0xFF; // Default all 1s (White background / transparent)
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
                                    // Dark/black pixel: clear bit to 0 (thermal dot fired)
                                    b &= (byte) ~(1 << (7 - bit));
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
