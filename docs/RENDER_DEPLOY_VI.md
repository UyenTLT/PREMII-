# Chạy CGMH PREMII Tracker trên Render

## Triển khai cấu hình đã chuẩn bị

[Mở Deploy to Render](https://render.com/deploy?repo=https%3A%2F%2Fgithub.com%2FUyenTLT%2FPREMII-%2Ftree%2Fcodex%2Fcgmh-premii-tracker)

Đăng nhập Render, chọn workspace và xem danh sách tài nguyên trước khi bấm **Deploy Blueprint / Create resources**. Cấu hình nằm trong render.yaml trên nhánh codex/cgmh-premii-tracker, không cần merge PR để dùng liên kết này.

Cấu hình tạo một Web Service mới tên cgmh-premii-tracker, Node.js 24, Singapore, một instance với plan 0.5c-512mb và persistent disk 1 GB. Đây là cấu hình có phí; xem số tiền Render hiển thị trước khi xác nhận tạo. Auto-deploy tắt; các lần sau triển khai qua Manual Deploy.

Bản premii-workspace cũ là Static Site. Render không chuyển runtime của Static Site sang Node; tạo Web Service mới là cần thiết. Không xóa dịch vụ cũ trước khi xác minh URL mới.

## Lệnh và biến môi trường

| Mục               | Giá trị                                |
| ----------------- | -------------------------------------- |
| Branch            | codex/cgmh-premii-tracker              |
| Build Command     | npm ci --include=dev && npm run build  |
| Start Command     | npm start                              |
| Node              | 24                                     |
| Health Check Path | /api/health                            |
| Disk mount        | /var/data                              |
| DATABASE_PATH     | /var/data/premii.sqlite                |
| SETUP_TOKEN       | Render tự sinh; không đưa vào Git/chat |

Next.js sử dụng PORT do Render cung cấp và lắng nghe trên 0.0.0.0. Cơ sở dữ liệu chỉ được mở khi chạy, không lúc build. Schema được tạo idempotent ở lần truy cập runtime đầu tiên; không đưa SQLite migration vào pre-deploy vì disk không được gắn ở bước đó.

## Lần đầu mở web

1. Chờ Render báo **Live** và mở URL do Render trả về.
2. Trong Render → service → Environment, xem SETUP_TOKEN đã được sinh.
3. Trên màn hình ứng dụng, nhập tên quản trị viên, mật khẩu mới tối thiểu 12 ký tự và Setup token. Tài khoản đầu tiên có ID admin. Không có mật khẩu mặc định.
4. Vào Study settings để tạo tài khoản entry/reviewer; tùy chọn tạo dữ liệu giả lập nếu cơ sở dữ liệu còn trống. Bệnh án thật không được tự động nạp.

Token chỉ dùng để bảo vệ tạo quản trị viên đầu tiên; khi đã có tài khoản thì bước setup đóng. Không gửi token trong chat. Cookie đăng nhập được đánh dấu Secure trên Render.

## Xác minh sau deploy

- GET /api/health phải trả HTTP 200 với status=ok; trả 503 nếu không truy cập được database.
- Đăng nhập và tạo một trẻ giả lập, một phiếu nháp, rồi tải CSV.
- Restart service; đăng nhập lại và kiểm tra trẻ/phiếu vẫn còn.
- Đảm bảo disk gắn ở /var/data và DATABASE_PATH nằm dưới đường dẫn này. Không dùng ổ đĩa tạm cho dữ liệu cần giữ.
- Sao lưu SQLite bằng công cụ backup của SQLite hoặc dừng service trước khi sao chép toàn bộ database/WAL. Disk snapshot không thay thế quy trình backup database nhất quán.

## Kết quả kiểm tra trong môi trường phát triển

14 kiểm thử quy tắc, 32 xác nhận API, 11 nhóm Chromium UI và production build đã qua. Build cũng qua khi DATABASE_PATH trỏ vào đường dẫn chưa được gắn. tests/render-smoke.mjs kiểm tra health, bootstrap token, Secure cookie, giữ dữ liệu sau restart và health 503 khi disk lỗi bằng dữ liệu giả lập. Đây là kiểm thử cục bộ tương đương cấu hình; chỉ Render báo Live mới xác nhận triển khai thật.

Nguồn: [Next.js on Render](https://render.com/docs/deploy-nextjs-app), [Persistent disks](https://render.com/docs/disks), [Blueprint specification](https://render.com/docs/blueprint-spec), [Deploy button và chọn branch](https://render.com/docs/deploy-to-render).
