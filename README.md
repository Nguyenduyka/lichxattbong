# Lịch Làm Việc Số — Cấu Trúc Sau Refactor

File gốc `index.html` (~1.2 MB, 6446 dòng) đã được tách thành cấu trúc nhiều file để dễ bảo trì và upload phân tán.

## Cấu trúc thư mục

```
dist/
├── index.html              ← Cấu trúc HTML chính (~895 KB, vẫn lớn vì có
│                              nhiều inline style/onclick handlers trong markup)
├── styles/
│   └── main.css            ← Toàn bộ CSS (~77 KB)
└── js/
    ├── 00-bootstrap.js     ← Viewport fix + ORG_CONFIG title (chạy đầu tiên)
    ├── 01-onesignal-init.js ← OneSignal deferred init
    ├── 02-login-tooltip.js ← Login button tooltip
    ├── 03-fullscreen-btn.js ← Auto-hide nút fullscreen
    ├── 04-lightbox.js      ← Lightbox xem ảnh/PDF
    ├── 05a-config-firebase.js  ← ORG_CONFIG + Firebase setup + OneSignal push
    ├── 05b-notification.js     ← Hệ thống thông báo
    ├── 05c-state-utils.js      ← State quản lý + Utils + Weather API
    ├── 05d-render-tables.js    ← Render bảng Viewer/Admin/Mobile/TV
    ├── 05e-admin-features.js   ← Admin auth + Cài đặt thời tiết + Form thêm/sửa
    ├── 05f-nav-download.js     ← Điều hướng tuần + Download/Print
    ├── 05g-extras.js           ← Tìm kiếm + QR + Thống kê + Xem tháng + Lặp lại
    ├── 05h-boot.js             ← Keyboard/Click events + BOOT (chạy cuối)
    ├── 06-pwa-install.js       ← Gợi ý cài PWA
    └── 07-ai-notify.js         ← Gemini AI + Modals thông báo nhanh
```

## Thứ tự load (rất quan trọng — không được đổi)

Thứ tự `<script>` trong `index.html` phải giữ nguyên như file gốc, vì các biến/hàm được share qua global scope. Nếu đổi thứ tự, app sẽ vỡ.

Cụ thể, code chia thành 3 vùng phụ thuộc:

1. **Trước `<head>` đóng**: `00-bootstrap.js` chạy ngay sau `<head>` mở để fix viewport + cập nhật title
2. **Trong `<body>`**: `01-onesignal-init.js` chạy trước khi OneSignal SDK CDN load
3. **Sau khi DOM render xong**: `02 → 03 → 04 → 05a–h → 06 → 07` — đây là phần chính, load tuần tự

## Cách deploy

### Hosting tĩnh (GitHub Pages, Firebase Hosting, Netlify, Vercel...)
Upload nguyên thư mục `dist/` lên. Không cần build, không cần Node.js.

### Mở trực tiếp `file://`
Mở `dist/index.html` trong trình duyệt. Có thể gặp lỗi CORS với Firebase — nếu vậy, dùng local server:
```bash
cd dist
python3 -m http.server 8000
# Truy cập http://localhost:8000
```

## Cách sửa code sau này

- **Sửa CSS** → mở `styles/main.css`
- **Sửa logic admin** (thêm/xoá/sửa lịch) → `js/05e-admin-features.js`
- **Sửa giao diện hiển thị bảng** → `js/05d-render-tables.js`
- **Sửa Firebase config** (đổi cơ quan) → `js/05a-config-firebase.js`
- **Sửa AI điền form** → `js/07-ai-notify.js`
- **Sửa state ban đầu** hay logic chung → `js/05c-state-utils.js`

## Upload phân tán (mục tiêu của bạn)

Vì các file này phụ thuộc lẫn nhau qua global scope, **không thể upload mỗi file lên một nơi khác nhau và load chéo** (do CORS + thứ tự). Cách khả thi:

1. **Upload tất cả lên 1 hosting riêng** (ví dụ Firebase Hosting), chỉ chia sẻ link, không chia sẻ source.
2. **Obfuscate** từng file JS trước khi upload (nếu lo bị copy code).
3. Nếu muốn upload phân tán thật sự, cần refactor sâu hơn (chuyển sang ES modules + dynamic import), vượt khỏi mức 2.

## Sau khi sửa, muốn quay về 1 file

Có thể tự "inline" lại để debug. Nội dung 8 file `05a–05h` ghép lại đúng bằng 1 byte chuỗi gốc đã xác minh.
