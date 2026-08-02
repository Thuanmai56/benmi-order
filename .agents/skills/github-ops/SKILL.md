---
name: github-ops
description: Perform GitHub tasks using GitHub CLI (gh) and Git including branch management, creating Pull Requests, checking GitHub Actions workflow status, managing GitHub secrets, reviewing PRs, interactive git workflows, and resolving git conflicts.
---

# GitHub Operations Skill (`github-ops`)

Skill này hướng dẫn quy trình chuẩn hóa để thực hiện các tác vụ GitHub cho dự án bằng **GitHub CLI (`gh`)** kết hợp với **Git**, bao gồm quản lý nhánh (branching), commit chuẩn hóa, tạo & quản lý Pull Request (PR), kiểm tra trạng thái GitHub Actions, tương tác với PR Agent, quản lý Secret, và giải quyết xung đột (merge conflicts).

---

## 1. Thiết lập & Đăng nhập GitHub CLI (`gh`)

### Kiểm tra & Đăng nhập
```bash
# Kiểm tra phiên bản gh
gh --version

# Đăng nhập tài khoản GitHub (chỉ cần làm 1 lần)
gh auth login
```
*Chọn các tùy chọn:*
- Where do you use GitHub? **GitHub.com**
- Preferred protocol for Git operations? **HTTPS** hoặc **SSH**
- Authenticate Git with your GitHub credentials? **Yes**
- How would you like to authenticate? **Log in with a web browser** (hoặc dùng Personal Access Token).

---

## 2. Quy Trình Tạo Branch & Commit

### Bước 1: Tạo nhánh mới từ `main`
```bash
git checkout main
git pull origin main
git checkout -b feat/ten-tinh-nang-moi   # hoặc fix/ten-loi
```

### Bước 2: Commit thay đổi
```bash
git add <danh-sach-file-hoac-folder>
git commit -m "feat: mo-ta-ngan-gon-thay-doi"
```

### Bước 3: Push nhánh lên GitHub
```bash
git push -u origin <ten-nhanh>
```

---

## 3. Quản Lý Pull Request (PR) bằng `gh` & Tương tác PR Agent

### Tạo Pull Request siêu tốc bằng `gh`
```bash
# Tạo PR tương tác (nhập tiêu đề & mô tả)
gh pr create

# Hoặc tạo nhanh PR lấy tiêu đề từ commit gần nhất
gh pr create --fill
```

### Kiểm tra & Checkout PR
```bash
# Lệt kê các PR đang mở
gh pr list

# Xem chi tiết một PR
gh pr view <pr-number>

# Checkout nhánh của một PR về máy để test
gh pr checkout <pr-number>
```

### Tương tác với Qodo PR-Agent trên PR
Bạn có thể gửi comment trực tiếp lên PR thông qua `gh` hoặc trên giao diện Web:
```bash
# Gửi lệnh cho PR Agent bằng gh
gh pr comment <pr-number> --body "/review"
gh pr comment <pr-number> --body "/improve"
gh pr comment <pr-number> --body "/ask Giải thích giúp tôi hàm này"
```
Các lệnh khả dụng:
- `/review`: Yêu cầu bot review toàn bộ mã nguồn thay đổi trong PR.
- `/describe`: Yêu cầu bot cập nhật bảng tóm tắt mục tiêu và danh sách thay đổi của PR.
- `/improve`: Yêu cầu bot đưa ra các gợi ý refactor code cụ thể bằng tiếng Việt.
- `/ask <câu hỏi>`: Đặt câu hỏi trực tiếp cho bot về logic code trong PR.

---

## 4. Kiểm Tra CI/CD GitHub Actions & Quản Lý Secret bằng `gh`

### Xem trạng thái & Log lỗi GitHub Actions
```bash
# Danh sách các lần chạy workflow gần đây
gh run list --limit 5

# Xem trực tiếp log bị lỗi của lần chạy thất bại gần nhất
gh run view --log-failed

# Triggers chạy lại workflow bị lỗi
gh run rerun <run-id>
```

### Quản lý Repository Secrets bằng `gh`
```bash
# Xem danh sách các Secrets hiện có
gh secret list

# Thêm hoặc cập nhật Secret (ví dụ GEMINI_KEY)
gh secret set GEMINI_KEY --body "YOUR_GEMINI_API_KEY_HERE"
```

---

## 5. Đồng Bộ Nhánh & Giải Quyết Merge Conflict

### Đồng bộ nhánh tính năng với `main` mới nhất
```bash
git fetch origin
git rebase origin/main
```

### Giải quyết Conflict khi có xung đột
1. Kiểm tra các file bị xung đột: `git status`
2. Mở file và sửa các đoạn đánh dấu `<<<<<<< HEAD` và `>>>>>>>`.
3. Lưu file và stage: `git add <file-da-sua>`
4. Tiếp tục rebase: `git rebase --continue`
5. Push cập nhật (dùng `--force-with-lease` nếu đã rebase):
```bash
git push origin <ten-nhanh> --force-with-lease
```
