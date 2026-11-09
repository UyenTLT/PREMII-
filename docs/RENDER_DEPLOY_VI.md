# Render Free — dùng lại PostgreSQL hiện có

## Lỗi đã xác định

`cannot have more than one active free tier database` nghĩa là workspace đã có một PostgreSQL Free. Bước Create database thất bại khiến bước tạo web bị canceled. Đây là giới hạn tài nguyên, không phải lỗi Next.js build.

render.yaml không khai báo tạo database mới. Chỉ có Node Web Service plan free, tham chiếu DATABASE_URL trực tiếp từ database hiện có cgmh-rehab-test-db trong My Workspace. Render tự truyền connection string nội bộ; credential không xuất hiện trong Git/chat. Database và web đều ở Singapore. Không xóa database hiện có để xử lý lỗi này.

## Áp dụng cấu hình mới

1. Mở Blueprint: https://dashboard.render.com/blueprint/exs-dbkpn0t9fdbs73c0rrp0 và Sync từ main của UyenTLT/PREMII-.
2. Trước khi tạo web, xác định PostgreSQL Free đang hoạt động, ngày hết hạn và region. Web mặc định Singapore; đặt cùng region với database để dùng Internal Database URL.
3. Kiểm tra DATABASE_URL dùng fromDatabase / cgmh-rehab-test-db / connectionString. Render giải quyết tham chiếu tới database có sẵn trong workspace mà không tạo hoặc quản lý lại database đó.
4. DATABASE_SCHEMA=premii đã có trong Blueprint. Bảng PREMII được tạo trong schema riêng, không dùng các bảng public.users của ứng dụng khác. Không tự di chuyển hoặc xóa dữ liệu PREMII từng lưu trong public.
5. Không cần dán DATABASE_URL thủ công khi dùng Blueprint hiện tại. Nếu triển khai vào workspace khác, đổi fromDatabase.name sang đúng database có sẵn hoặc tự cấu hình secret trên Render.
6. Deploy web, chờ Live và kiểm tra /api/health trả status=ok. Chỉ chạy retry sau khi DATABASE_URL đã được cấu hình.

Nếu dùng tích hợp Render trong ChatGPT, cần hoàn tất Connect và cấp quyền tài khoản để trợ lý đọc danh sách database, đặt biến môi trường và chạy deploy. Gửi link dashboard không tự cấp quyền truy cập.

## Lần đầu đăng nhập

Render tự sinh SETUP_TOKEN cho web. Xem token ở service → Environment, nhập trực tiếp trên màn hình tạo quản trị viên cùng tên và mật khẩu mới tối thiểu 12 ký tự. ID đầu tiên là admin. Không gửi token trong chat.

## Cấu hình

| Mục                   | Giá trị                                     |
| --------------------- | ------------------------------------------- |
| Service               | cgmh-premii-tracker-free                    |
| Type / runtime / plan | Web Service / Node.js 24 / free             |
| Database              | Dùng lại PostgreSQL hiện có; không tạo mới  |
| Branch                | main                                        |
| Build                 | npm ci --include=dev && npm run build       |
| Start                 | npm start                                   |
| Health                | /api/health                                 |
| DATABASE_URL | fromDatabase: cgmh-rehab-test-db / connectionString |
| DATABASE_SCHEMA       | premii                                      |
| SETUP_TOKEN           | generateValue: true                         |
| Disk trả phí          | Không dùng                                  |

Bản cũ dạng Static Site có Publish Directory ./public không chạy được backend. Chọn Web Service mới; không thêm public rỗng để che lỗi. Mã nguồn cũ đã được thay trên GitHub main, nhưng service/disk cũ trên Render không tự bị xóa. Kiểm tra/sao lưu dữ liệu trước khi xóa tài nguyên không còn dùng.

## Giới hạn Free và bảo toàn dữ liệu

Database đang dùng là cgmh-rehab-test-db, id dpg-dbbgvklg1s2s738v3uvg-a, Singapore; Render báo hết hạn **19/11/2026 lúc 14:53 Asia/Taipei**. Một workspace chỉ có một Free PostgreSQL, dung lượng 1 GB. Database Free hết hạn 30 ngày sau ngày tạo ban đầu; dùng lại database không đặt lại thời hạn đó. Sau hết hạn, Render có 14 ngày gia hạn trước khi xóa nếu không nâng cấp. Không có backup tự động cho Free. Web Free ngủ sau 15 phút không dùng.

Ứng dụng chỉ khởi tạo bảng trong schema được cấu hình. Dữ liệu PostgreSQL/SQLite cũ không được tự động chuyển đổi hay xóa. Sao lưu đầy đủ PostgreSQL bằng pg_dump trên máy tin cậy và xuất CSV trước khi hết hạn. Không đưa bản sao lưu bệnh án lên GitHub.

## Kiểm thử

Typecheck/build và kiểm thử PostgreSQL cục bộ bao gồm API, sửa đồng thời, browser, restart và lỗi database. QA cố ý tạo bảng public.users không tương thích, chạy PREMII trong các schema riêng và xác nhận bảng public không đổi. Báo cáo: docs/postgres-test-results.json. Kết quả cục bộ không phải xác nhận Render đã Live.

Tài liệu chính thức: [Free limits](https://render.com/docs/free), [Blueprint secrets](https://render.com/docs/blueprint-spec#prompting-for-secret-values), [PostgreSQL connection và region](https://render.com/docs/postgresql-creating-connecting).
