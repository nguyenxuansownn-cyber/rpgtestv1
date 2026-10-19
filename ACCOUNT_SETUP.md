# Thiết lập tài khoản trực tuyến cho KNIGHT

Game hiện được host bằng GitHub Pages, nên GitHub Pages không chạy được máy chủ đăng nhập riêng. Bản nâng cấp dùng **Supabase Auth + PostgreSQL** để tạo tài khoản email/mật khẩu và lưu tiến trình theo từng tài khoản.

## 1. Tạo dịch vụ Supabase

1. Vào https://supabase.com/ và tạo một project mới.
2. Trong Dashboard, mở **SQL Editor**.
3. Mở file `supabase/schema.sql` trong repo, sao chép toàn bộ và chạy. File này tạo bảng `public.game_saves` và bật chính sách Row Level Security (RLS) để mỗi người chỉ đọc/ghi dữ liệu của chính mình.
4. Trong Supabase Dashboard, tìm **Project URL** và khóa công khai **Publishable key** (hoặc khóa anon cũ).
5. Mở `supabase-config.js` trong repo và thay hai giá trị `YOUR_PROJECT_ID` và `YOUR_SUPABASE_PUBLISHABLE_OR_ANON_KEY`. Chỉ dùng khóa công khai. **Không bao giờ đưa service_role/secret key vào JavaScript trình duyệt.**
6. Trong Supabase → **Authentication → URL Configuration**, thêm URL trang game vào danh sách Redirect URLs: `https://nguyenxuansownn-cyber.github.io/rpgtestv1/`.
7. Nếu bật xác nhận email, kiểm tra cấu hình email của dự án. Người chơi phải xác nhận email trước khi đăng nhập. Có thể tắt xác nhận trong giai đoạn thử nghiệm, nhưng nên bật khi phát hành.

## 2. Đưa code lên GitHub Pages

Các thay đổi được chuẩn bị trên nhánh `feature/online-accounts-supabase` để không ghi đè bản đang chạy. Sau khi điền cấu hình Supabase, hãy mở Pull Request hoặc merge nhánh này vào `main`; GitHub Pages sẽ triển khai bản mới theo cấu hình repo.

## 3. Dữ liệu cũ được giữ thế nào?

- Game vẫn dùng khóa lưu cũ `drgCityMiniSaveV2`; không xóa dữ liệu hiện có trên thiết bị.
- Khi đăng nhập lần đầu, nếu có dữ liệu cục bộ nhưng chưa có dữ liệu trực tuyến, game tự tải bản cục bộ lên tài khoản.
- Nếu cả hai bản đều có dữ liệu, game cho bạn chọn dùng bản trực tuyến hoặc tải bản trên thiết bị lên tài khoản. Bản không được chọn không bị xóa bởi thao tác này.
- Nếu chỉ có dữ liệu trực tuyến, game tải bản đó về và tải lại trang để nạp bằng bộ đọc save hiện tại.

## 4. Giới hạn bảo mật cần biết

- Mật khẩu được Supabase Auth quản lý; game không tự lưu mật khẩu trong `localStorage`.
- Khóa công khai Supabase dùng ở trình duyệt; quyền truy cập dữ liệu được giới hạn bằng RLS. Không đưa khóa bí mật/service role vào repo.
- Đây là đồng bộ tiến trình cho game chạy ở trình duyệt. Vì logic chiến đấu và tính chỉ số vẫn chạy phía máy khách, người chơi có kỹ thuật vẫn có thể sửa dữ liệu của chính họ trước khi đồng bộ. RLS ngăn đọc/ghi dữ liệu người khác nhưng **không chống gian lận chỉ số**. Muốn chống gian lận mạnh cần thêm máy chủ có thẩm quyền để xác nhận phần thưởng và thay đổi chỉ số.
- Bảng lưu chỉ cho phép mỗi tài khoản đọc, tạo và cập nhật hàng của chính mình; không cấp quyền truy cập cho người chưa đăng nhập.

## 5. Kiểm tra sau khi cấu hình

1. Tạo một tài khoản bằng email của bạn.
2. Xác nhận email nếu được yêu cầu rồi đăng nhập.
3. Chơi một lúc, nhấn **Lưu ngay** hoặc chờ tự đồng bộ.
4. Mở game trên trình duyệt/thiết bị khác, đăng nhập cùng tài khoản và kiểm tra cấp độ, vàng, quặng, trang bị và đệ tử.
5. Tạo tài khoản thứ hai và kiểm tra không thể đọc dữ liệu của tài khoản đầu tiên.

Tài liệu chính thức: https://supabase.com/docs/guides/auth và https://supabase.com/docs/guides/database/postgres/row-level-security
