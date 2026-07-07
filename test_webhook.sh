#!/bin/bash

# Mặc định sử dụng URL Staging, có thể truyền URL local khi chạy: ./test_webhook.sh http://localhost:8787
HOST=${1:-"https://spring-smoke-46ba.thuanmnc.workers.dev"}

echo "========================================================="
echo "   ĐANG TIẾN HÀNH KIỂM THỬ WEBHOOK TRÊN:"
echo "   $HOST"
echo "========================================================="
echo ""

run_test() {
  local num=$1
  local name=$2
  local text=$3
  
  echo "👉 Test Case #$num: $name"
  echo "   [Khách nhắn]: \"$text\""
  
  # Đo thời gian bắt đầu
  local start_time
  if [[ "$OSTYPE" == "darwin"* ]]; then
    # macOS
    start_time=$(perl -MTime::HiRes=time -e 'printf("%.0f\n", time()*1000)')
  else
    # Linux
    start_time=$(date +%s%3N)
  fi
  
  # Gửi request webhook
  local response
  response=$(curl -s -w "\n%{http_code}" -X POST "$HOST/webhook" \
    -H "Content-Type: application/json" \
    -d "{
      \"events\": [
        {
          \"type\": \"message\",
          \"replyToken\": \"test_token_$num\",
          \"source\": {
            \"type\": \"user\",
            \"userId\": \"Utest_user_id_999\"
          },
          \"message\": {
            \"id\": \"msg_$num\",
            \"type\": \"text\",
            \"text\": \"$text\"
          },
          \"timestamp\": $(date +%s000)
        }
      ]
    }")
  
  # Đo thời gian kết thúc
  local end_time
  if [[ "$OSTYPE" == "darwin"* ]]; then
    end_time=$(perl -MTime::HiRes=time -e 'printf("%.0f\n", time()*1000)')
  else
    end_time=$(date +%s%3N)
  fi
  
  # Tách body và HTTP status code
  local body
  body=$(echo "$response" | head -n 1)
  local status
  status=$(echo "$response" | tail -n 1)
  
  # Tính toán độ trễ (ms)
  local latency=$(( end_time - start_time ))
  
  echo "   [Phản hồi từ Worker]: \"$body\" (HTTP $status)"
  echo "   [Thời gian phản hồi]: ${latency}ms"
  echo "---------------------------------------------------------"
}

# 1. Quick reply (Không dùng AI)
run_test "1" "Quick Reply (Giờ mở cửa - Trả lời cứng)" "營業時間"

# 2. AI intent YES (Có gọi AI)
run_test "2" "Đặt hàng gián tiếp (Kỳ vọng AI -> YES)" "我今天晚上想訂3個麵包，現在可以先點嗎？"

# 3. AI intent NO (Có gọi AI)
run_test "3" "Hỏi nguyên liệu bánh (Kỳ vọng AI -> NO)" "你們的帕尼尼是用什麼起司？素食可以吃嗎？"

echo "=== KIỂM THỬ HOÀN THÀNH ==="
