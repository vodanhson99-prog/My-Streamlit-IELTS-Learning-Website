# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Stack

Next.js App Router, React, TypeScript, Tailwind CSS v4, shadcn/ui, pnpm.

## Users

Người học IELTS tự ôn, luyện từng kỹ năng tại nhà.

## Product Purpose

IELTS with RBS cung cấp workspace luyện Reading và Writing, chấm điểm tức thời, phản hồi theo tiêu chí IELTS và gợi ý bước học tiếp theo. Thành công là người học luyện đều đặn và biết rõ cần cải thiện gì sau mỗi phiên.

## Positioning

Sản phẩm kết hợp bài Reading có chấm điểm, Writing feedback cục bộ hoặc AI, Explain Bot và Coach phân tích lịch sử trong một workspace nhẹ, không bắt buộc tài khoản.

## Operating Context

Người học mở app trên trình duyệt, chọn một kỹ năng, hoàn thành bài, xem phản hồi rồi dùng Coach hoặc Explain Bot để quyết định phiên tiếp theo. Progress lưu trong trình duyệt hiện tại.

## Capabilities and Constraints

- Reading passage và câu hỏi trắc nghiệm có chấm điểm tức thời.
- Writing Task 2 có word count, heuristic feedback và AI feedback qua server route.
- Explain Bot giải thích câu trả lời dựa trên câu hỏi, đáp án của người học và đáp án đúng.
- Coach và Progress hiển thị xu hướng từ lịch sử local.
- Không thêm auth, database hoặc teacher workflow trong phạm vi hiện tại.
- API key AI phải chỉ tồn tại ở server.

## Brand Commitments

Tên sản phẩm là ielts with rbs. Giao diện cần rõ ràng, tập trung vào nhiệm vụ học và không gây nhiễu.

## Evidence on Hand

- Nội dung Reading và Writing hiện có trong `src/lib/ielts.ts`.
- Luồng UI và API đã chuyển sang `src/app/` và `src/components/ielts/`.
- Không có testimonials, customer logos hoặc benchmark thương mại được xác nhận; không được bịa thêm.

## Product Principles

- Mỗi phiên học phải kết thúc bằng feedback có thể hành động.
- Hiển thị tiến bộ bằng dữ liệu người học đã tạo, không bằng claim giả.
- Giữ đường đi từ bài tập đến bước tiếp theo ngắn.
- Dữ liệu cá nhân mặc định nằm trong trình duyệt; secrets nằm phía server.

## Accessibility & Inclusion

Giữ semantic HTML, keyboard focus rõ ràng, nhãn form đầy đủ, trạng thái loading/error/empty và hỗ trợ reduced motion.
