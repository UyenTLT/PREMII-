# Bàn giao CGMH PREMII Tracker

Đã đọc đủ PDF, Word và bốn TXT trong môi trường được cấp. Không đưa nội dung bệnh án thật vào mã nguồn, seed, kiểm thử hoặc gói bàn giao.

## Đã chạy thành công

- 14 kiểm thử quy tắc nghiệp vụ.
- 29 xác nhận API, kèm kiểm tra dữ liệu lưu trong backend, lịch sử và CSV tiếng Trung.
- TypeScript typecheck và Next.js production build.
- API: tạo trẻ → tạo phiếu → lưu nháp → gửi duyệt → yêu cầu sửa → gửi lại → xác nhận → sửa đổi phiên bản → xuất CSV; nhập TXT giả lập, ngăn nhập trùng, rà soát bằng chứng.

## Chạy ứng dụng

Node.js 24 trở lên:

```
npm ci
cp .env.example .env.local
npm run dev
```

Mở http://localhost:3000. Tạo quản trị viên với mật khẩu tối thiểu 12 ký tự. Vào Study settings để tạo dữ liệu giả lập và tài khoản entry/reviewer. Backend dùng SQLite lưu trên đĩa; cấu hình đường dẫn qua DATABASE_PATH. Với máy production, chạy npm run build rồi npm start, dùng ổ đĩa bền vững và reverse proxy HTTPS.

## Quy tắc chờ CGMH xác nhận

1. PDF được ưu tiên ở chỗ Word ghi Ncpap sai cho low-flow. nCPAP là RES1=4, low-flow nasal cannula <2 L/min là RES1=2, OA bỏ qua. Mốc 2 L/min là nhóm pressure support.
2. Chưa có bảng trọng số, cách gộp ca, thành phần cân nặng và xử lý thiếu để tính tổng PREMII. Tổng điểm bị khóa; mã trả lời vẫn có.
3. FiO₂ có phần thập phân ở khoảng trống không tự làm tròn. Cần chọn mức thủ công và ghi bằng chứng.
4. Quy ước PNA tính theo số chu kỳ 24 giờ đã trôi qua, ngày sinh = 0; PMA = GA lúc sinh + PNA.
5. Thuốc được kê và thuốc đã dùng được lưu riêng theo sự khác nhau giữa PDF và Word.

## Giới hạn cần biết

- Đã kiểm thử qua Chromium: tạo quản trị viên, seed giả lập, tạo trẻ, ca qua nửa đêm, lưu nháp, chuyển low-flow/OA, đối chiếu TXT, xác nhận bằng chứng, duyệt, biểu đồ và tải CSV. 11 nhóm kiểm tra giao diện đã qua; không có lỗi JavaScript chưa được xử lý. Báo cáo ở docs/browser-test-results.json. Ảnh chỉ giữ cục bộ trong thư mục được loại khỏi Git.
- Chưa có URL chạy ứng dụng để người dùng thao tác: preview relay của môi trường chưa chạy. Trang Sites riêng tư hiện cung cấp gói ZIP để tải xuống. Ứng dụng bàn giao chạy độc lập, không dùng SQLite trên môi trường serverless/ổ đĩa tạm.
- Giao diện chính có Trung phồn thể/Anh; một số nhãn chi tiết vẫn song ngữ, chưa chuyển toàn bộ chuỗi vào catalog.
- Trích xuất TXT dựa trên regex có chủ đích thận trọng: đề xuất thiết bị, lưu lượng, FiO₂, cân nặng và đường nuôi ăn; cảnh báo phủ định/kế hoạch/lịch sử. Không tự gán sự kiện cho ca, không tự điền phiếu và không tính số biến cố từ từ khóa. Người duyệt xác nhận nguồn, thời gian và nhập quan sát cuối cùng.
- Quyền tạo/sửa phiếu và duyệt kiểm tra phía backend; sửa đồng thời phiếu/nguồn được kiểm soát bằng phiên bản. Chưa có SSO, reset/deactivate tài khoản hoặc tự động hóa backup.
- Mã nguồn mới thay thế bản file-only cũ ở thư mục gốc của nhánh codex/cgmh-premii-tracker trên GitHub; lịch sử bản cũ vẫn giữ trong Git. Trang GitHub Pages/Render static trước đây không chạy backend Next.js/SQLite của bản mới.

Xem README.md, docs/DOCUMENT_CROSSWALK.md và docs/DATA_DICTIONARY.md để biết cấu trúc và phạm vi chính xác.
