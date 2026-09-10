#!/usr/bin/env python3
"""
Mock ESC/POS Thermal Printer Server (TCP Port 9100)
Simulates a network thermal receipt printer on macOS / Linux / Windows.
Captures raw ESC/POS commands and raster bitmap data (GS v 0), printing receipts in real-time to the terminal.
"""

import socket
import sys
import os

PORT = 9100
HOST = '0.0.0.0'

def start_mock_server():
    server = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
    server.setsockopt(socket.SOL_SOCKET, socket.SO_REUSEADDR, 1)
    
    try:
        server.bind((HOST, PORT))
        server.listen(5)
        print("=" * 65)
        print(f"🖨️  MOCK ESC/POS THERMAL PRINTER SERVER READY ON PORT {PORT}")
        print(f"📡  Listening on {HOST}:{PORT}")
        print("💡  Point your POS settings to: 127.0.0.1:9100 or your Mac's LAN IP")
        print("=" * 65 + "\n")
    except Exception as e:
        print(f"❌ Failed to bind server to port {PORT}: {e}")
        sys.exit(1)

    job_counter = 1

    while True:
        try:
            client, addr = server.accept()
            print(f"\n⚡ [{job_counter}] New Print Job received from {addr[0]}:{addr[1]}")
            
            data = bytearray()
            client.settimeout(3.0)
            while True:
                try:
                    chunk = client.recv(4096)
                    if not chunk:
                        break
                    data.extend(chunk)
                except socket.timeout:
                    break
            
            client.close()
            print(f"📦 Payload size: {len(data)} bytes")

            # Parse Raster Bitmap (GS v 0) or text
            parse_and_display_payload(data, job_counter)
            job_counter += 1

        except KeyboardInterrupt:
            print("\n🛑 Shutting down Mock Printer Server.")
            break
        except Exception as err:
            print(f"⚠️ Error handling print job: {err}")

    server.close()

def parse_and_display_payload(data: bytearray, job_id: int):
    gs_v_0 = bytes([0x1D, 0x76, 0x30, 0x00])
    idx = data.find(gs_v_0)

    print("-" * 65)
    print(f"📄 RECEIPT PRINT PREVIEW (JOB #{job_id})")
    print("-" * 65)

    if idx != -1:
        header_idx = idx + 4
        if len(data) >= header_idx + 4:
            xL = data[header_idx]
            xH = data[header_idx + 1]
            yL = data[header_idx + 2]
            yH = data[header_idx + 3]

            width_bytes = xL + (xH << 8)
            height_dots = yL + (yH << 8)
            width_dots = width_bytes * 8

            print(f"🖼️  Raster Dot Matrix: {width_dots} dots wide x {height_dots} dots tall (80mm standard)")
            print(f"📦 Data Payload: {len(data)} bytes received via TCP socket")

            raw_bitmap_data = data[header_idx + 4: header_idx + 4 + (width_bytes * height_dots)]

            # Save as PNG image using PIL
            try:
                from PIL import Image
                img = Image.new('1', (width_dots, height_dots), 1) # 1-bit monochrome (1 = white, 0 = black)
                pixels = img.load()

                for y in range(height_dots):
                    row_offset = y * width_bytes
                    for x_byte in range(width_bytes):
                        if row_offset + x_byte < len(raw_bitmap_data):
                            b = raw_bitmap_data[row_offset + x_byte]
                            for bit in range(8):
                                x = x_byte * 8 + bit
                                if x < width_dots:
                                    # In ESC/POS, bit 1 = black dot, bit 0 = white
                                    is_black = (b & (1 << (7 - bit))) != 0
                                    pixels[x, y] = 0 if is_black else 1

                output_path = os.path.join(os.path.dirname(__file__), "latest_printed_receipt.png")
                img.save(output_path)
                print(f"💾 Saved high-resolution receipt image to: {output_path}")
            except Exception as e:
                print(f"⚠️ Could not save PNG: {e}")

            # Terminal preview
            render_ascii_bitmap(raw_bitmap_data, width_bytes, height_dots)
            print(f"✂️  Auto-Cut Command: GS V 0 (Full Paper Cut)")
    else:
        try:
            text = data.decode('utf-8', errors='ignore')
            print(text)
        except Exception:
            print(f"(Raw Binary Data - {len(data)} bytes)")

    print("-" * 65 + "\n")

def render_ascii_bitmap(bitmap_bytes, width_bytes, height_dots):
    scale_x = 8 # 8 dots per char
    scale_y = 12 # 12 dots per char
    out_w = (width_bytes * 8) // scale_x
    out_h = min(height_dots, 600) // scale_y

    print("┌" + "─" * out_w + "┐")
    for row in range(out_h):
        y_start = row * scale_y
        line_str = "│"
        for col in range(out_w):
            x_start = col * scale_x
            black_count = 0
            for dy in range(scale_y):
                y = y_start + dy
                if y >= height_dots:
                    break
                row_offset = y * width_bytes
                for dx in range(scale_x):
                    x = x_start + dx
                    x_byte = x // 8
                    bit = x % 8
                    if row_offset + x_byte < len(bitmap_bytes):
                        b = bitmap_bytes[row_offset + x_byte]
                        if (b & (1 << (7 - bit))) != 0:
                            black_count += 1
            # Density threshold
            if black_count >= 12:
                line_str += "█"
            elif black_count >= 6:
                line_str += "▓"
            elif black_count >= 2:
                line_str += "░"
            else:
                line_str += " "
        line_str += "│"
        print(line_str)
    print("└" + "─" * out_w + "┘")

if __name__ == '__main__':
    start_mock_server()
