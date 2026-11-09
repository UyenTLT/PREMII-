# Bàn giao CGMH PREMII Tracker — Render Free

Mã nguồn mới thay ứng dụng file-only cũ ở thư mục gốc. Bản Render dùng PostgreSQL và Node.js 24; SQLite chỉ dùng khi phát triển cục bộ. Bệnh án thật, cơ sở dữ liệu runtime, mật khẩu và ảnh không được đưa vào Git.

## Đã kiểm thử

- 14 kiểm thử quy tắc PREMII.
- API: xác thực/role, tạo trẻ, ca qua nửa đêm, nháp/gửi duyệt/yêu cầu sửa/xác nhận/sửa đổi, stale version, hai lần lưu đồng thời, nhập TXT trùng, bằng chứng và CSV tiếng Trung.
- Chromium: tạo admin, seed giả lập, tạo trẻ/phiếu, chuyển low-flow/OA, đối chiếu nguồn, duyệt, biểu đồ, tải CSV và tablet.
- Typecheck và production build; build không cần kết nối database.
- Chạy kiểm thử API, browser và restart trên PostgreSQL thật trong container cục bộ với một database giả lập có bảng public.users của ứng dụng khác và các schema PREMII riêng. Kiểm tra dữ liệu public không bị thay đổi, rồi xóa database QA sau kiểm thử. Báo cáo ở docs/postgres-test-results.json.

## Deploy Free

Xem docs/RENDER_DEPLOY_VI.md. render.yaml tạo một Web Service Free và dùng lại PostgreSQL qua DATABASE_URL; không tạo thêm database hoặc disk trả phí. Schema premii tách bảng của ứng dụng khỏi dữ liệu có sẵn. Render Free PostgreSQL hết hạn sau 30 ngày và web ngủ sau 15 phút không truy cập. Dữ liệu dài hạn cần xuất/backup trước hạn.

Blueprint đã được người dùng báo deployed, nhưng phiên này chưa truy cập được tài khoản Render để xác nhận URL/service live. URL dashboard Blueprint không phải URL công khai của ứng dụng. Kết quả trong báo cáo là kiểm thử cục bộ; cần kiểm tra health của đúng URL Render sau khi Sync cấu hình mới.

## Quy tắc chờ CGMH xác nhận

PDF được ưu tiên ở chỗ Word ghi Ncpap cho low-flow: nCPAP thuộc RES1=4, continuous low-flow nasal cannula dưới 2 L/min thuộc RES1=2 và OA được bỏ qua. Mốc 2 L/min là hỗ trợ áp lực. Cần CGMH duyệt quyết định này.

Không có đủ bảng trọng số, cách gộp ca, thành phần cân nặng và cách xử lý thiếu để tính tổng PREMII. Tổng điểm bị khóa. FiO₂ thập phân không tự làm tròn; chọn mức thủ công cần bằng chứng. Quy ước tuổi: PNA theo số chu kỳ 24 giờ đã trôi qua, ngày sinh=0; PMA=GA lúc sinh+PNA. Thông tin kê thuốc và đã dùng được lưu riêng.

## Giới hạn

Một số nhãn chi tiết vẫn song ngữ. Regex chỉ đề xuất từ nguồn và yêu cầu người duyệt xác nhận; không tính biến cố từ tần suất từ khóa. Chưa có SSO, reset/deactivate tài khoản hay backup scheduler. Không tự động xóa hoặc di chuyển dữ liệu của SQLite/disk cũ.

Chi tiết biến và nhánh: docs/DOCUMENT_CROSSWALK.md, docs/DATA_DICTIONARY.md. Chạy cục bộ theo README.md.
