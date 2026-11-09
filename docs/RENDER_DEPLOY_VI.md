# Chạy miễn phí trên Render

Cấu hình render.yaml mới chỉ khai báo **Web Service plan free + PostgreSQL plan free**, không có disk hoặc dịch vụ tính phí. Mã mới thay bản file-only cũ ở thư mục gốc repository.

## Giới hạn Free cần biết

Render Free PostgreSQL có dung lượng 1 GB và hết hạn sau **30 ngày**. Sau đó database không truy cập được; Render có giai đoạn gia hạn 14 ngày trước khi xóa nếu không nâng cấp. Bản miễn phí không có backup tự động. Web Free ngủ sau 15 phút không có truy cập và cần thời gian bật lại. Đây là bản demo; dữ liệu nghiên cứu cần lưu lâu dài phải có giải pháp lưu trữ khác.

Nguồn: https://render.com/docs/free

## Áp dụng vào Blueprint đã tạo

1. Mở Blueprint hiện có: https://dashboard.render.com/blueprint/exs-dbkpn0t9fdbs73c0rrp0
2. Sync cấu hình mới từ GitHub. Repository là UyenTLT/PREMII-, branch main, file render.yaml. Nếu Blueprint còn theo dõi codex/cgmh-premii-tracker thì nhánh đó cũng đã nhận cấu hình Free; có thể chuyển theo dõi sang main.
3. Xem trước tài nguyên: cgmh-premii-tracker-free là **Free Web Service**, cgmh-premii-db là **Free PostgreSQL**. Không xác nhận tài nguyên trả phí. Nếu workspace đã có một Free PostgreSQL, cần dùng database đó hoặc giải quyết giới hạn một Free database/workspace trước.
4. Chờ cả database và web báo Live. Trong service cgmh-premii-tracker-free, sao chép URL do Render cấp (dạng https://…onrender.com). Đây mới là URL ứng dụng; link dashboard Blueprint không phải URL web.

Nếu tạo mới từ đầu: [Deploy to Render](https://render.com/deploy?repo=https%3A%2F%2Fgithub.com%2FUyenTLT%2FPREMII-).

Cấu hình tạo tên service mới để tránh tự ý xóa hoặc ghi đè disk/database của bản trước. **Render không tự xóa tài nguyên trả phí cũ khi thêm service Free**. Nếu trước đây đã tạo cgmh-premii-tracker kèm disk trả phí, kiểm tra/sao lưu dữ liệu trước rồi xóa tài nguyên cũ trong Render khi không còn dùng. Chỉ xóa mã nguồn cũ trong Git không dừng phí dịch vụ Render.

## Thiết lập lần đầu

Render tự liên kết DATABASE_URL từ PostgreSQL vào web service và tự sinh SETUP_TOKEN. Không gửi các giá trị này vào chat hoặc đưa lên Git.

1. Xem SETUP_TOKEN tại service mới → Environment.
2. Mở URL ứng dụng, nhập tên quản trị viên, mật khẩu mới tối thiểu 12 ký tự và Setup token. ID tài khoản đầu tiên là admin.
3. Trong Study settings, tạo tài khoản entry/reviewer và tùy chọn seed giả lập nếu database trống. Ứng dụng không tự nạp bệnh án thật.

## Lệnh và biến môi trường

| Mục             | Giá trị                                         |
| --------------- | ----------------------------------------------- |
| Runtime         | Node.js 24                                      |
| Web plan        | free                                            |
| Database plan   | free                                            |
| Region          | Singapore cho cả web và database                |
| Branch          | main                                            |
| Build           | npm ci --include=dev && npm run build           |
| Start           | npm start                                       |
| Health          | /api/health                                     |
| DATABASE_URL    | fromDatabase: cgmh-premii-db / connectionString |
| SETUP_TOKEN     | generateValue: true                             |
| Persistent disk | Không dùng                                      |

Next.js dùng PORT do Render cung cấp và bind 0.0.0.0. Schema PostgreSQL được khởi tạo khi chạy, không trong bước build. Nếu Render thiếu DATABASE_URL, ứng dụng báo lỗi thay vì âm thầm lưu SQLite vào ổ tạm.

## Kiểm tra và sao lưu

GET /api/health phải trả HTTP 200 / status=ok. Đăng nhập, tạo trẻ/phiếu giả lập và tải CSV. Restart web service để kiểm tra dữ liệu còn nguyên trong PostgreSQL. Health trả 503 khi database không truy cập được.

Trước khi hết 30 ngày, xuất CSV nghiên cứu và dùng pg_dump trên máy tin cậy để sao lưu đầy đủ PostgreSQL, bao gồm bằng chứng, tài khoản và lịch sử. Lưu backup an toàn, không đưa lên repository công khai. Dữ liệu của SQLite bản trước không được tự động xóa hoặc tự động chuyển sang PostgreSQL; giữ backup trước khi bỏ dịch vụ cũ.

Render Free còn có giới hạn giờ chạy, bandwidth và build minutes. Xem usage/spend limit trên dashboard; không nâng cấp dịch vụ trả phí để xử lý giới hạn khi yêu cầu chỉ dùng Free.
