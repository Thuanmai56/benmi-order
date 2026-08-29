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
    # Check if payload contains GS v 0 (0x1D 0x76 0x30 0x00)
    gs_v_0 = bytes([0x1D, 0x76, 0x30, 0x00])
    idx = data.find(gs_v_0)

    print("-" * 55)
    print(f"📄 RECEIPT PRINT PREVIEW (JOB #{job_id})")
    print("-" * 55)

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
            
            print(f"🖼️ Raster Bitmap detected: {width_dots}px width x {height_dots}px height")
            
            # Simple ASCII Art preview of the top portion of the bitmap
            raw_bitmap_data = data[header_idx + 4:]
            render_ascii_bitmap(raw_bitmap_data, width_bytes, min(height_dots, 80))
            print(f"✅ Cut Command detected: GS V 0")
    else:
        # Raw text fallback
        try:
            text = data.decode('utf-8', errors='ignore')
            print(text)
        except Exception:
            print(f"(Raw Binary Data - {len(data)} bytes)")
            
    print("-" * 55 + "\n")

def render_ascii_bitmap(bitmap_bytes, width_bytes, max_lines):
    print("┌" + "─" * (width_bytes // 2) + "┐")
    for y in range(0, max_lines, 2): # Downsample vertically by 2
        line_str = "│"
        row_offset = y * width_bytes
        for x_byte in range(0, width_bytes, 2): # Downsample horizontally by 2
            if row_offset + x_byte < len(bitmap_bytes):
                b = bitmap_bytes[row_offset + x_byte]
                line_str += "█" if (b & 0b11000000) != 0 else " "
            else:
                line_str += " "
        line_str += "│"
        print(line_str)
    print("└" + "─" * (width_bytes // 2) + "┘")

if __name__ == '__main__':
    start_mock_server()
