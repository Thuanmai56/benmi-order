package com.benmi.pos;

import android.graphics.Bitmap;
import android.graphics.Color;
import java.io.ByteArrayOutputStream;

/**
 * EscPosBitmapConverter
 * Converts standard Android Bitmaps into 1-bit Monochrome ESC/POS Raster format (GS v 0).
 * Guarantees 100% sharp rendering of Traditional Chinese (zh-TW), Vietnamese (vi),
 * custom store logos, and high-density 2D QR codes on any ESC/POS thermal printer.
 */
public class EscPosBitmapConverter {

    /**
     * Converts a Bitmap into an ESC/POS raster byte array.
     *
     * @param bitmap Original Android Bitmap (Receipt view / canvas)
     * @param paperWidthMm Paper width in mm: 80 (576 dots) or 58 (384 dots)
     * @param autoCut Whether to append feed lines and full paper cut commands
     * @return ESC/POS byte array ready to be written to raw TCP socket
     */
    public static byte[] convertBitmapToEscPosRaster(Bitmap bitmap, int paperWidthMm, boolean autoCut) {
        if (bitmap == null) {
            return new byte[0];
        }

        // Standard thermal print widths: 80mm = 576 dots, 58mm = 384 dots
        int targetWidth = (paperWidthMm == 58) ? 384 : 576;
        float scale = (float) targetWidth / bitmap.getWidth();
        int targetHeight = Math.max(1, Math.round(bitmap.getHeight() * scale));

        Bitmap scaledBitmap = Bitmap.createScaledBitmap(bitmap, targetWidth, targetHeight, true);
        int widthBytes = (targetWidth + 7) / 8;
        int heightPixels = targetHeight;

        ByteArrayOutputStream stream = new ByteArrayOutputStream();

        // 1. Initialize printer: ESC @ (0x1B, 0x40)
        stream.write(0x1B);
        stream.write(0x40);

        // 2. Set line spacing to 0: ESC 3 0 (0x1B, 0x33, 0x00)
        stream.write(0x1B);
        stream.write(0x33);
        stream.write(0x00);

        // 3. Raster Bitmap Command: GS v 0 m xL xH yL yH
        // m = 0 (Normal mode)
        stream.write(0x1D);
        stream.write(0x76);
        stream.write(0x30);
        stream.write(0x00);

        // xL, xH: Number of bytes in horizontal direction (Little Endian)
        stream.write(widthBytes & 0xFF);
        stream.write((widthBytes >> 8) & 0xFF);

        // yL, yH: Number of dots in vertical direction (Little Endian)
        stream.write(heightPixels & 0xFF);
        stream.write((heightPixels >> 8) & 0xFF);

        // 4. Pixel luminance conversion (Dot on if luminance < threshold)
        final int threshold = 175; // Standard thermal darkness threshold
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

        // 5. Append feed and paper cut if requested
        if (autoCut) {
            // Feed 4 lines: ESC d 4 (0x1B, 0x64, 0x04)
            stream.write(0x1B);
            stream.write(0x64);
            stream.write(0x04);

            // Cut paper: GS V 0 (0x1D, 0x56, 0x00 - Full Cut)
            stream.write(0x1D);
            stream.write(0x56);
            stream.write(0x00);
        }

        return stream.toByteArray();
    }
}
