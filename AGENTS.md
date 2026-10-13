# Quy tắc bắt buộc cho AI và lập trình viên

File này áp dụng cho toàn bộ repository. Mọi AI/coding agent phải đọc hết file này trước khi phân tích, sửa code, review, commit hoặc deploy.

Bối cảnh sản phẩm: đây là game nội bộ cho một nhóm bạn tin cậy. Bảo mật chống người chơi cố ý xem dữ liệu/role không phải mục tiêu. Không đề xuất backend phức tạp, tách read model hoặc hệ thống phân quyền chỉ vì bảo mật. Chỉ giữ các biện pháp tối thiểu cần cho tính đúng, tránh xóa nhầm, mất dữ liệu, write rác và chi phí/lag không cần thiết.

Mục tiêu cao nhất, theo thứ tự:

1. Đúng logic và không làm mất dữ liệu.
2. Thao tác của người chơi phải phản hồi tức thì, kể cả trên điện thoại và mạng yếu.
3. Hệ thống phải an toàn khi nhiều người thao tác đồng thời.
4. Code dễ đọc, dễ test, dễ thay đổi và có thể scale.
5. Hiệu ứng đẹp nhưng không được đánh đổi độ mượt hoặc khả năng truy cập.

## 1. Nguyên tắc không được vi phạm

- Không tối ưu theo cảm tính. Trước khi sửa phải xác định luồng dữ liệu, điểm render, listener, request và write bị ảnh hưởng.
- Không được che giấu lag bằng loading dài. UI phải phản hồi optimistic ngay, sau đó hiển thị trạng thái đồng bộ/thất bại rõ ràng.
- Không ghi toàn bộ `gameData` cho mỗi click của người chơi.
- Không dùng transaction cho thao tác chỉ cần cập nhật một field độc lập. Transaction chỉ dùng khi cần bảo vệ invariant phụ thuộc dữ liệu vừa đọc.
- Không lưu base64, blob, ảnh lớn hoặc dữ liệu trùng lặp trong document Firestore. Dùng Storage/CDN và chỉ lưu URL.
- Không tạo listener không giới hạn cho collection lớn. Query phải thu hẹp theo room, user, status hoặc phạm vi cần thiết.
- Không để listener, timer, animation frame hoặc subscription sống sau khi component unmount.
- Không để snapshot nhận từ server tự động ghi ngược lại server nếu dữ liệu không thay đổi.
- Không dùng `any`, mutate state trực tiếp, nuốt lỗi rỗng, hoặc copy logic game sang nhiều component.
- Không thêm dependency lớn khi API trình duyệt hoặc utility nhỏ trong project đã giải quyết được.
- Không thay schema online theo cách làm hỏng phòng/ván đang chơi. Mọi schema mới phải tương thích ngược hoặc có migration/rollout rõ ràng.

## 2. Ngân sách hiệu năng

Mọi tính năng mới phải hướng tới các mức sau trên điện thoại tầm trung:

- Phản hồi hình ảnh sau tap/click: trong 100 ms.
- Animation thông thường: 60 FPS; không có main-thread task kéo dài quá 50 ms nếu có thể chia nhỏ.
- Mỗi action realtime: payload mục tiêu dưới 16 KB. Không gửi lại danh sách player, avatar hay toàn bộ lịch sử nếu action chỉ thay đổi một lựa chọn.
- Firestore document: giữ dưới 200 KB như một soft limit. Nếu có nguy cơ tăng không giới hạn, tách collection/document.
- Màn hình chính không được tải asset không cần thiết. Route/tính năng nặng phải cân nhắc lazy load.
- Bundle tăng đáng kể phải được giải thích trong kết quả bàn giao. Không chấp nhận dependency trùng chức năng.

Ngân sách là mục tiêu kỹ thuật, không phải lý do để hy sinh tính đúng. Nếu không đạt, agent phải nói rõ số đo, nguyên nhân và hướng xử lý.

## 3. Firebase/Firestore realtime

### Mô hình ghi

- Action của người chơi phải là write nhỏ, độc lập và idempotent.
- Mỗi action phải gắn ít nhất `gameId` và `roundNumber` hoặc một revision tương đương. Action cũ không bao giờ được áp dụng sang ván/vòng mới.
- Hai người thao tác cùng lúc phải ghi các field/document độc lập; không dùng read-modify-write cả object nếu có thể tránh.
- Dùng transaction cho join room, giới hạn số người, chuyển trạng thái cần invariant hoặc thao tác có tranh chấp thực sự.
- Debounce/throttle các action có thể phát sinh liên tục, nhưng không được làm UI chậm theo.
- Không tạo lại document phòng đã bị chủ phòng xóa. Khi cần, dùng `updateDoc` thay vì upsert.

### Mô hình đọc

- Listener phải query đúng phạm vi, unsubscribe trong cleanup và không đăng ký lại chỉ vì render.
- Không coi lỗi mạng tạm thời là document đã bị xóa.
- Tận dụng local cache/offline queue. UI phải phân biệt `synced`, `syncing` và `offline` khi điều này ảnh hưởng tới người chơi.
- Tránh fan-out listener: một màn hình không nên mở nhiều listener cho cùng một dữ liệu.
- Danh sách phòng chỉ đọc metadata cần hiển thị. Khi quy mô tăng, dùng document directory/summary riêng, không tải `gameData` của mọi phòng.

### Dữ liệu và an toàn vận hành

- Chấp nhận việc `gameData` chứa role của cả phòng để giữ kiến trúc đơn giản và realtime nhanh. Không coi đây là lỗi cần sửa trong phạm vi nội bộ.
- Firestore Rules chỉ cần đủ để tránh người ngoài vô tình ghi/xóa dữ liệu, payload quá lớn hoặc thao tác làm hỏng phòng. Không đánh đổi độ mượt để xây phân quyền chi tiết.
- Không log token hoặc config nhạy cảm. Role game không được coi là dữ liệu bảo mật trong project này.
- Tính số read/write và kích thước dữ liệu trước khi tạo listener/collection mới.

## 4. React và state management

- Giữ logic thuần (pure game logic) trong `src/game`. Firebase/network ở `src/services`. Component chỉ điều phối UI, không nhúng query Firestore trực tiếp.
- Chỉ lưu state tối thiểu. Dữ liệu có thể suy ra từ props/state hiện có thì suy ra trong render hoặc pure helper.
- Không dùng effect để nhân bản state hoặc tạo chuỗi render không cần thiết.
- Dependency của hook phải đúng. Không tắt rule hook chỉ để hết cảnh báo; nếu bắt buộc phải ghi rõ invariant ngay tại code.
- Không `memo`, `useMemo`, `useCallback` tràn lan. Chỉ dùng khi có render nặng, identity thực sự quan trọng hoặc profiler cho thấy lợi ích.
- Danh sách phải có key ổn định; không dùng index nếu phần tử có thể thêm/xóa/sắp xếp.
- Tác vụ bất đồng bộ phải có error state phù hợp, chống double-submit và không update component đã unmount.
- Dùng functional state update khi state mới phụ thuộc state cũ.
- Component lớn phải được tách theo trách nhiệm khi việc tách làm logic/test/render dễ hiểu hơn; không tách chỉ để đạt một số dòng tùy ý.

## 5. Animation và trải nghiệm mobile

- Animation liên tục chỉ nên thay đổi `transform` và `opacity`. Tránh animate `width`, `height`, `top`, `left`, blur/filter lớn hoặc box-shadow phức tạp.
- Tránh layout thrashing: không xen kẽ đọc layout và ghi style trong loop/frame.
- Tự động giảm số phần tử/particle khi số người chơi tăng. Với 13–20 người, ưu tiên bố cục đại diện/nhóm thay vì render một hiệu ứng nặng cho từng người.
- Tôn trọng `prefers-reduced-motion`; trải nghiệm không được phụ thuộc vào việc animation phải chạy xong.
- Nút bấm trên mobile phải có vùng chạm tối thiểu 44×44 px, có pressed/disabled/loading state rõ ràng.
- Không chặn main thread bằng xử lý ảnh, shuffle lớn, JSON stringify lớn hoặc loop nặng ngay lúc user tap.
- Ảnh phải có kích thước phù hợp, định dạng tối ưu, width/height hoặc aspect-ratio để tránh layout shift; lazy load nếu không ở màn hình đầu.
- Luôn kiểm tra layout ở 4, 8, 12, 16 và 20 người; không chỉ test data nhỏ.

## 6. Kiến trúc và khả năng bảo trì

- Type/domain model chuẩn nằm trong `src/game/types.ts`. Không tạo type gần giống nhau ở nhiều nơi.
- Luật game là pure function khi có thể và phải có unit test. UI không tự quyết định luật thắng/thua, role order hoặc resolve action.
- Mỗi module/function phải có một trách nhiệm rõ. Tên phải mô tả intent, không mô tả chi tiết tạm thời.
- Loại bỏ code cũ không còn caller sau khi migrate. Không giữ API nguy hiểm “phòng khi cần”.
- Comment giải thích lý do, invariant hoặc trade-off; không lặp lại code bằng văn xuôi.
- Error message cho user phải dễ hiểu; log cho developer phải có context như room/game/action nhưng không lộ dữ liệu nhạy cảm.
- Hành vi retry phải có giới hạn/backoff, trừ offline queue do Firebase quản lý. Không tạo retry loop vô hạn trong UI.
- Mọi thay đổi schema phải ghi rõ: dữ liệu cũ được đọc ra sao, dữ liệu mới được ghi khi nào, rollback thế nào.

## 7. Quy trình bắt buộc trước khi sửa code

1. Đọc `AGENTS.md`, file liên quan, type, service và test hiện có.
2. Kiểm tra `git status`; không ghi đè thay đổi của user hoặc task khác.
3. Mô tả ngắn luồng trước/sau: ai ghi, ghi gì, ai nghe, UI phản hồi lúc nào, offline và concurrent ra sao.
4. Chọn thay đổi nhỏ nhất giải quyết nguyên nhân gốc; không refactor lan man.
5. Viết/cập nhật test cho logic, regression và dữ liệu cũ.
6. Chạy kiểm tra bắt buộc và xem diff trước khi commit.

## 8. Kiểm thử bắt buộc

Tối thiểu phải chạy:

```bash
npm test -- --run
npm run build
npm run lint
git diff --check
```

Ngoài unit test, thay đổi realtime/UI phải xem xét các kịch bản sau:

- Hai người bấm cùng lúc.
- Double tap hoặc đổi lựa chọn liên tục.
- Mạng chậm, mất mạng giữa action và kết nối lại.
- Snapshot cũ đến sau snapshot mới.
- Chuyển round/chuyển ván khi action cũ còn pending.
- Reload, Back, đóng tab và mở nhiều tab.
- 4, 8, 12, 16 và 20 người chơi.
- Android tầm trung và iPhone/Safari nếu thay đổi animation, input, audio hoặc persistence.

Không được tạo warning/error mới. Warning cũ không liên quan có thể ghi nhận, nhưng nếu chạm vào file đó thì ưu tiên không làm tình trạng xấu hơn.

## 9. Definition of Done

Chỉ được báo hoàn thành khi:

- Logic đúng và có test phù hợp.
- Không tăng write contention, listener fan-out, payload hoặc render không cần thiết.
- UI phản hồi ngay và có trạng thái khi đồng bộ thất bại/chậm.
- Hoạt động đúng với dữ liệu cũ, mạng yếu và thao tác đồng thời.
- Test, build, lint và diff check đã chạy; kết quả được báo trung thực.
- Agent báo rõ file đã đổi, trade-off còn lại và bước deploy/migration nếu có.

## 10. Ngoại lệ

Nếu yêu cầu sản phẩm buộc phải vi phạm một quy tắc hoặc ngân sách trên, không được âm thầm bỏ qua. Agent phải nói rõ:

- Quy tắc nào bị vi phạm.
- Vì sao không có phương án an toàn hơn trong phạm vi hiện tại.
- Tác động đến user, chi phí Firebase và khả năng scale.
- Kế hoạch giảm thiểu, rollback hoặc tech debt cụ thể.

Không được dùng ngoại lệ chỉ để làm nhanh hơn.
