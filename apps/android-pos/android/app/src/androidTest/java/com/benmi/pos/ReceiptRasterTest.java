package com.benmi.pos;

import android.graphics.Bitmap;
import android.graphics.Color;
import org.junit.Test;
import static org.junit.Assert.*;

public class ReceiptRasterTest {
    @Test public void feedsAfterAllRasterRowsAndCutsOnce() {
        for (int width : new int[]{58, 80}) {
            for (boolean cut : new boolean[]{false, true}) {
                int dots = width == 58 ? 384 : 576;
                Bitmap bitmap = Bitmap.createBitmap(dots, 1701, Bitmap.Config.ARGB_8888);
                bitmap.eraseColor(Color.WHITE);
                // Last row must survive chunking and appear before the feed/cut.
                bitmap.setPixel(0, 1700, Color.BLACK);
                byte[] bytes = EscPosBitmapConverter.convertBitmapToEscPosRaster(bitmap, width, cut);
                int pos = 5; // ESC @, ESC 3 0
                int rows = 0;
                while (pos + 1 < bytes.length && (bytes[pos] & 255) == 29 && bytes[pos + 1] == 118) {
                    int rowBytes = (bytes[pos + 4] & 255) + ((bytes[pos + 5] & 255) << 8);
                    int height = (bytes[pos + 6] & 255) + ((bytes[pos + 7] & 255) << 8);
                    assertEquals(dots / 8, rowBytes);
                    assertEquals(1701, height);
                    if (rows + height == 1701) {
                        assertEquals(128, bytes[pos + 8 + (height - 1) * rowBytes] & 255);
                    }
                    rows += height;
                    pos += 8 + rowBytes * height;
                }
                assertEquals(1701, rows);
                byte[] tail = java.util.Arrays.copyOfRange(bytes, pos, bytes.length);
                assertArrayEquals(cut
                    ? new byte[]{27, 50, 27, 74, (byte)160, 29, 86, 1}
                    : new byte[]{27, 50}, tail);
                bitmap.recycle();
            }
        }
    }
}
