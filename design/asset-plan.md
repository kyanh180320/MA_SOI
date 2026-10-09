# KẾ HOẠCH NGHỆ THUẬT & DESIGN SYSTEM (DARK GOTHIC FANTASY) - BẢN CẬP NHẬT 2.1

> **Dự án:** Web Game Ma Sói (React + TypeScript + Vite)  
> **Phiên bản tài liệu:** 2.1 (Đã duyệt & chuẩn hóa pipeline)  
> **Nguyên tắc bất biến:**  
> - TUYỆT ĐỐI KHÔNG sửa logic game trong `src/game/`.  
> - Tối ưu 60fps mượt mà cho iPhone 7 Plus (Safari iOS 15).  
> - Toàn bộ ảnh tham khảo cũ đã chuyển khỏi `public/` sang `design/reference/`.  
> - Quy trình refactor Bước 1: Sau mỗi lần tách một component, DỪNG LẠI, gửi kịch bản chơi thử và CHỜ user xác nhận "OK" trước khi tách tiếp.

---

## 1. BẢNG MÀU CHỦ ĐẠO & FONT CHỮ TIẾNG VIỆT

### 1.1. Bảng màu trích xuất từ ảnh Concept (Mã Hex)

| Tên Màu Token | Mã Hex | Vai trò & Ứng dụng |
| :--- | :--- | :--- |
| `--color-bg-deep` | `#0B0C16` | Nền tối sâu thẳm toàn màn hình, đá obsidian |
| `--color-bg-night-amethyst` | `#1B1633` | Tím đêm ma thuật (Pha Ban Đêm, màn Tiên tri / Phù thủy) |
| `--color-bg-night-sapphire` | `#141C38` | Xanh lam thẫm bầu trời đêm |
| `--color-bg-day-ash` | `#22242B` | Xám tro đá cổ ban ngày (thời khắc Bình minh & Thảo luận) |
| `--color-stone-dark` | `#161922` | Khung đá đen than chì, nút phụ ("Bỏ Qua", "Cài Đặt") |
| `--color-stone-border` | `#3A4154` | Viền vát đá, rãnh kim loại dập nổi |
| `--color-gold-bright` | `#E5C378` | Ánh sáng vàng đồng viền khiên, điểm nhấn sáng (Highlight) |
| `--color-gold-base` | `#B88E3E` | Vàng đồng kim loại cổ baroque |
| `--color-gold-shadow` | `#5C3E14` | Bóng đổ rãnh kim loại vàng |
| `--color-ruby-glow` | `#E53950` | Ánh đỏ ngọc Ruby phát sáng (Nút "Bỏ Phiếu", mục tiêu bị chọn cắn) |
| `--color-ruby-base` | `#961628` | Đỏ đun dập nổi (Phe Sói, Tòa án luận tội) |
| `--color-ruby-deep` | `#4A0B14` | Bóng đổ đáy nút nguy hiểm / loại trừ |
| `--color-parchment-light` | `#D8C3A5` | Nền giấy da cổ sáng (Bảng thông báo, ô chat, sớ tử nạn) |
| `--color-parchment-dark` | `#8C7351` | Vết ố viền giấy da |
| `--color-text-ink` | `#24180B` | Mực nâu cổ điển trên nền giấy da |
| `--color-text-light` | `#F5ECD5` | Chữ vàng kim nhạt trên nền đá tối |
| `--color-text-dim` | `#9B9EB3` | Chữ phụ, nhãn chú thích xám tro |
| `--color-emerald-glow` | `#2ECC71` | Xanh ngọc hồi sinh (Bình cứu Phù Thủy, Người còn sống) |
| `--color-poison-glow` | `#9B59B6` | Tím độc dược (Bình độc Phù Thủy) |

### 1.2. Font chữ chuẩn Tiếng Việt (100% không lỗi dấu)

- **Font Tiêu Đề (Headings, Buttons lớn, Ruy-băng):**  
  **`Playfair Display, serif`** (Google Fonts).  
  *Lưu ý:* Bỏ hoàn toàn `Cinzel Decorative` vì thiếu bộ ký tự tiếng Việt. `Playfair Display` là kiểu chữ Serif cổ điển, sắc sảo, hoàng gia và hỗ trợ dấu tiếng Việt 100% chuẩn xác.  
  *Bộ từ khóa đã kiểm tra:* `ĐÊM XUỐNG`, `HỘI ĐỒNG PHÁN XÉT`, `BỎ PHIẾU`, `BỎ QUA`, `TIÊN TRI`, `BẢO VỆ`, `PHÙ THỦY`, `THỢ SĂN`.
- **Font Nội dung & Giao diện (Body, Input, Badge, Tile):**  
  **`Be Vietnam Pro, sans-serif`** (Google Fonts) – Bộ font hiện đại thiết kế riêng cho tiếng Việt, độ cao dòng chuẩn, cực kỳ rõ nét trên màn hình Retina iPhone cỡ nhỏ.
- **Font dự phòng khi mất mạng (Fallback):**  
  - Tiêu đề: `Georgia, serif`  
  - Nội dung: `system-ui, -apple-system, sans-serif`

---

## 2. BẢNG CHUẨN HÓA NHÃN GIAO DIỆN TIẾNG VIỆT

Toàn bộ nhãn hiển thị trong game sẽ dùng tiếng Việt tự nhiên, trang nghiêm theo phong cách Dark Fantasy:

| Nhãn Concept (English) | Bản Dịch Tiếng Việt Chuẩn | Vị trí xuất hiện |
| :--- | :--- | :--- |
| **THE COVENANT SLEEPS** | **ĐÊM XUỐNG** | Ruy-băng tiêu đề Pha Ban Đêm |
| **THE TRIBUNAL** | **HỘI ĐỒNG PHÁN XÉT** | Ruy-băng tiêu đề Pha Bỏ Phiếu |
| **CAST VOTE** | **BỎ PHIẾU** | Nút chính đỏ Ruby trong pha bỏ phiếu |
| **ABSTAIN** | **BỎ QUA** (hoặc **PHIẾU TRẮNG**) | Nút phụ đá xám khi không muốn vote ai |
| **NIGHT ACTION: SELECT A TARGET** | **HÀNH ĐỘNG ĐÊM: CHỌN MỤC TIÊU** | Khung chỉ thị giấy da pha đêm |
| **BACK TO-HAND** | **ÚP BÀI LẠI** | Nút úp lại lá bài bí mật |
| **CONFIRM** | **XÁC NHẬN** | Nút chốt hành động đêm / bỏ phiếu |
| **LAUNCH MATCH** | **BẮT ĐẦU VÁN** | Nút bắt đầu trận đấu tại phòng chờ |
| **SETTINGS** | **CÀI ĐẶT** | Nút cấu hình phòng / âm thanh |
| **CHAT BOX** | **BẢNG THÔNG BÁO PHÒNG** | Khung giấy da phòng chờ (chưa làm chat) |
| **THE SEER** | **TIÊN TRI** | Tên vai trên thẻ bài & giao diện |
| **THE BEAST / WOLF** | **MA SÓI** | Tên vai trên thẻ bài & giao diện |
| **DEMON WOLF** | **SÓI QUỶ** | Tên vai trên thẻ bài & giao diện |
| **THE OUTCAST / VILLAGER** | **DÂN LÀNG** | Tên vai trên thẻ bài & giao diện |
| **THE WITCH** | **PHÙ THỦY** | Tên vai trên thẻ bài & giao diện |
| **THE GUARDIAN** | **BẢO VỆ** | Tên vai trên thẻ bài & giao diện |
| **THE HUNTER** | **THỢ SĂN** | Tên vai trên thẻ bài & giao diện |

---

## 3. BẢNG GHÉP MÀN HÌNH CONCEPT VỚI TRANG / ROUTE

| Màn Concept | Trang / Route Hiện Có | Cấu Trúc Giao Diện Thực Tế |
| :--- | :--- | :--- |
| **"THE LOBBY" Screen** | `/room/:roomId` ([RoomPage.tsx](src/pages/RoomPage.tsx)) | - Nền hầm đá đuốc cháy (`bg_lobby.webp`)<br>- Lưới khiên hiệp sĩ hiển thị người chơi trong phòng<br>- Khung giấy da thông tin phòng (`parchment_panel.webp`)<br>- Nút dập nổi: "BẮT ĐẦU VÁN", "CÀI ĐẶT" |
| **"THE NIGHT PHASE" Screen** | `/play` ([PlayPage.tsx](src/pages/PlayPage.tsx)) & [PlayerLiveView.tsx](src/components/PlayerLiveView.tsx) | **Thiết kế thực tế (không dùng 3 lá bài):**<br>1. Phía trên: Ruy-băng "ĐÊM XUỐNG" + lá bài vai trò đang hành động thu nhỏ (compact preview)<br>2. Ở giữa: Khung hướng dẫn giấy da + **Lưới khiên avatar của tất cả người còn sống** (3-4 cột hỗ trợ tới 20 người) để chọn mục tiêu<br>3. Phía dưới: Nút dập nổi "XÁC NHẬN" & "ÚP BÀI LẠI" |
| **"THE VOTING" Screen** | `/play` (Phase `'vote'`) & [PlayerLiveView.tsx](src/components/PlayerLiveView.tsx) | - Ruy-băng tiêu đề "HỘI ĐỒNG PHÁN XÉT" đính Ruby đỏ<br>- Danh sách người chơi dạng thanh viền kim loại dập nổi<br>- Icon trạng thái: gươm chỉ điểm, cán cân công lý, ngón tay chỉ trích<br>- Mục tiêu được chọn phát sáng viền đỏ rực lửa<br>- Nút bấm lớn "BỎ PHIẾU" (Ruby) & "BỎ QUA" (Đá xám) |
| **"DAWN & DISCUSSION"** | `/play` (Phase `'day'`) | - Nền làng sương mai (`bg_day.webp`)<br>- Thông báo cáo phó nạn nhân đêm qua trên bảng giấy da<br>- Đồng hồ đếm ngược thảo luận viền kim loại |
| **"VICTORY / WINGAME"** | `/play` (Phase `'ended'`) | - Hào quang chiến thắng Phe Sói (Đỏ rực) hoặc Dân Làng (Vàng kim)<br>- Tổng kết số vòng và danh hiệu |
| **"HISTORY"** | `/history` ([HistoryPage.tsx](src/pages/HistoryPage.tsx)) | - Danh sách cuộn dạng biên niên sử trên nền đá cổ |
| **"DEV COMPONENT SHOWCASE"** | `/dev` ([DevShowcasePage.tsx](src/pages/DevShowcasePage.tsx)) | - Chỉ hoạt động khi `import.meta.env.DEV`, loại trừ khỏi build production<br>- Có ô kiểm thử font tiếng Việt và hiển thị toàn bộ component ở mọi trạng thái |

---

## 4. THÀNH PHẦN CSS THUẦN & KỸ THUẬT AVATAR CHO SAFARI 15

Mọi thành phần dưới đây được dựng 100% bằng CSS / Tokens, không tốn dung lượng ảnh và tương thích tuyệt đối Safari iOS 15:

1. **`GameButton` (Nút bấm dập nổi Tactile):**
   - Biến thể `ruby` (Đỏ đun phát sáng: Bỏ phiếu, Cắn người, Bắt đầu)
   - Biến thể `gold` (Vàng hoàng gia: Xác nhận, Soi bài, Tạo phòng)
   - Biến thể `stone` (Đá xám xước: Bỏ qua, Cài đặt, Rời phòng)
   - Trạng thái: `default`, `:hover`, `:active` (lún 2px + shadow co lại), `:disabled` (tối màu, mất ánh kim)
2. **Kỹ thuật `ShieldAvatar` (KHÔNG DÙNG CSS mask-image):**
   - **Lớp dưới:** `<div className="avatar-crop">` chứa ảnh đại diện, được cắt góc hình khiên/tròn bằng `border-radius: 4px` hoặc `clip-path: polygon(...)`.
   - **Lớp trên:** `<img className="shield-frame" src="/art/frame_shield.webp" />` (khung khiên đã được đục lỗ giữa trong suốt nhờ magenta keying) đè lên với `position: absolute; inset: 0; pointer-events: none`.
   - **Trạng thái `:selected`:** CSS `filter: drop-shadow(0 0 8px #4fc3f7)`.
   - **Trạng thái `:dead`:** CSS `filter: grayscale(1) brightness(0.6)` kèm icon `icon_skull.webp` đè ở giữa.
3. **`PlayerVoteRow` (Thanh người chơi bỏ phiếu):**
   - Thanh viền kim loại dập nổi, hiển thị tên, icon cán cân/gươm và số phiếu.
   - Trạng thái `:targeted`: Viền phát sáng đỏ rực lửa hổ phách.
4. **`ParchmentBox` (Khung giấy da viền sắt):**
   - Nền CSS radial-gradient giả da cổ kết hợp ảnh texture mờ nhạt.
5. **`PhaseStepper` (Thanh tiến trình pha & role đêm):**
   - Rãnh kim loại sáng chạy ngang nối các ngọc đá quý; bước đang gọi phát sáng nhịp thở nhẹ nhàng.

---

## 5. BẢNG KIỂM KÊ ASSET ẢNH MVP (`public/art/`) & DUNG LƯỢNG

Tất cả ảnh mới được đặt tại `public/art/`. Định dạng **WebP**, chất lượng 80-85%.  
Giới hạn dung lượng: **Hình nền ≤ 200KB**, **Asset nhỏ ≤ 120KB**.

| Tên File | Đường dẫn | Kích thước | Nền trong suốt | Vai trò sử dụng | Dung lượng ước tính |
| :--- | :--- | :--- | :--- | :--- | :--- |
| `bg_lobby.webp` | `public/art/` | **750x1334** | Không | Nền phòng chờ (`/room`), Setup | ~130 KB |
| `bg_night.webp` | `public/art/` | **750x1334** | Không | Nền Pha Ban Đêm (`/play`, `PlayerLiveView`) | ~140 KB |
| `bg_day.webp` | `public/art/` | **750x1334** | Không | Nền Pha Ban Ngày & Bỏ phiếu | ~130 KB |
| `frame_shield.webp` | `public/art/` | 320x380 | Có (Green/Magenta key) | Khung avatar người chơi toàn game | ~50 KB |
| `ribbon_covenant.webp` | `public/art/` | 800x180 | Có (Green key) | Tiêu đề Ban Đêm ("ĐÊM XUỐNG") | ~40 KB |
| `ribbon_tribunal.webp` | `public/art/` | 800x180 | Có (Green key) | Tiêu đề Bỏ Phiếu ("HỘI ĐỒNG PHÁN XÉT") | ~40 KB |
| `parchment_panel.webp` | `public/art/` | 700x450 | Có (Green key) | Bảng thông báo phòng & bảng cáo phó | ~50 KB |
| `card_back.webp` | `public/art/` | **480x720** | Không | Mặt sau thẻ bài Tarot (tạo đầu tiên làm chuẩn) | ~70 KB |
| `card_wolf.webp` | `public/art/` | **480x720** | Không | Thẻ bài Ma Sói (có title plate trống) | ~75 KB |
| `card_demon_wolf.webp` | `public/art/` | **480x720** | Không | Thẻ bài Sói Quỷ (có title plate trống) | ~75 KB |
| `card_seer.webp` | `public/art/` | **480x720** | Không | Thẻ bài Tiên Tri (có title plate trống) | ~75 KB |
| `card_witch.webp` | `public/art/` | **480x720** | Không | Thẻ bài Phù Thủy (có title plate trống) | ~75 KB |
| `card_guard.webp` | `public/art/` | **480x720** | Không | Thẻ bài Bảo Vệ (có title plate trống) | ~75 KB |
| `card_hunter.webp` | `public/art/` | **480x720** | Không | Thẻ bài Thợ Săn (có title plate trống) | ~75 KB |
| `card_villager.webp` | `public/art/` | **480x720** | Không | Thẻ bài Dân Làng (có title plate trống) | ~70 KB |
| `icon_skull.webp` | `public/art/` | 128x128 | Có (Green key) | Biểu tượng tử vong / người chơi đã chết | ~20 KB |
| `icon_moon.webp` | `public/art/` | 128x128 | Có (Green key) | Biểu tượng trăng khuyết / pha đêm | ~20 KB |
| `icon_potion_heal.webp` | `public/art/` | 128x128 | Có (Green key) | Bình giải dược xanh lục của Phù Thủy | ~20 KB |
| `icon_potion_poison.webp` | `public/art/` | 128x128 | Có (Green key) | Bình thuốc độc tím của Phù Thủy | ~20 KB |
| `icon_eye.webp` | `public/art/` | 128x128 | Có (Green key) | Con mắt tiên tri thần bí | ~20 KB |

> **Tổng dung lượng gói Art MVP:** **~1.29 MB** (Nằm an toàn dưới giới hạn 2.0 MB).

---

## 6. QUY TRÌNH TẠO THẺ & BỘ PROMPT AI TIẾNG ANH

### 6.1. Quy trình giữ đồng bộ cho 8 Thẻ Bài
1. **Bước 1:** Sinh ảnh `card_back.webp` đầu tiên để chốt chuẩn khung kim loại gothic, ánh sáng và chất liệu viền.
2. **Bước 2:** Dùng ảnh `card_back.webp` làm Image Reference / Style Reference cho 7 thẻ bài vai trò còn lại.
3. **Bước 3:** Đính kèm đồng thời ảnh nhân vật gốc trong `design/reference/` (`wolf.png`, `demonWolf.png`, `seer.png`, `witch.png`, `guardian.png`, `hunter.png`, `human.png`) để AI giữ nguyên tạo hình khuôn mặt, trang phục và thần thái nhân vật.
4. **Bước 4:** Mọi thẻ bài đều có bảng tên dập nổi trống ở cạnh đáy: `with an EMPTY blank ornamental title plate at the bottom, no text on it`. Tên vai tiếng Việt sẽ được hiển thị bằng code CSS phủ lên.
5. **Quy cách khung viền:** Khung thẻ chạm sát 4 mép ảnh (`the card frame fills the entire image edge to edge, no background outside the frame, rectangular canvas`), việc bo góc sẽ do CSS `border-radius` đảm nhiệm.

---

### 6.2. Bộ Prompt Tiếng Anh Chi Tiết Cho AI Sinh Ảnh

*(Mọi prompt đều bao gồm câu tham chiếu chuẩn: "Use the attached images as the strict style reference for materials, colors and ornament language.")*

#### Hình Nền Môi Trường (750x1334, Nền Kín)
1. **`bg_lobby.webp`**:
   > `dark gothic medieval stone fortress hall interior, massive vaulted stone arches, burning wall torches casting warm moody amber flickering light, dark atmospheric fantasy RPG lobby background, ominous stone walls, high detailed texture, masterpiece digital painting, 750x1334 vertical composition, cinematic lighting, textless, no characters. Use the attached images as the strict style reference for materials, colors and ornament language.`

2. **`bg_night.webp`**:
   > `eerie dark fantasy mystical night sky, huge full moon shrouded in glowing purple and sapphire blue mist, silhouetted gothic castle spires and twisted dead trees at bottom edge, dark amethyst clouds, subtle starlight, dark occult atmosphere, 750x1334 vertical wallpaper, highly detailed digital art, textless, no characters. Use the attached images as the strict style reference for materials, colors and ornament language.`

3. **`bg_day.webp`**:
   > `gloomy medieval gothic village square at cold dawn, weathered stone cobblestone ground, ancient timbered tavern buildings in misty fog, muted pale amber sun rays cutting through cold grey clouds, dark fantasy atmospheric background, 750x1334 vertical composition, photorealistic painterly style, textless, no people. Use the attached images as the strict style reference for materials, colors and ornament language.`

#### Khung Khiên Avatar (Green/Magenta Keying)
4. **`frame_shield.webp`**:
   > `ornate dark gothic heraldic shield shaped avatar frame, intricately carved dark iron and filigree bronze metal trim, fantasy RPG UI portrait border, perfectly symmetrical front view. CRITICAL TRANSPARENCY REQUIREMENT: The outer background around the shield frame must be completely solid pure green color #00FF00, and the center opening hole inside the frame where portrait sits must be completely solid pure magenta pink color #FF00FF, crisp clean sharp edges, textless, no portrait inside. Use the attached images as the strict style reference for materials, colors and ornament language.`

#### Ruy-băng Tiêu Đề & Giấy Da (Chroma Green #00FF00)
5. **`ribbon_covenant.webp`**:
   > `gothic dark fantasy horizontal stone and metallic header banner ribbon, elongated flat blank center area for text overlay, ornate filigree wings and carved metal edges, glowing purple amethyst gemstones mounted at the corners, isolated on solid pure chroma green background #00FF00, textless, completely blank center surface, clean sharp edges. Use the attached images as the strict style reference for materials, colors and ornament language.`

6. **`ribbon_tribunal.webp`**:
   > `ornate dark gothic baroque stone and bronze tribunal header ribbon, wide elongated blank central bar, rich decorative filigree borders, glowing polished blood red ruby gems embedded in top and side corners, isolated on solid pure chroma green background #00FF00, textless, completely blank middle plate, clean sharp edges. Use the attached images as the strict style reference for materials, colors and ornament language.`

7. **`parchment_panel.webp`**:
   > `ancient aged fantasy parchment scroll paper panel, rough torn frayed deckle edges, subtle stained sepia antique texture, framed with dark rustic iron corner brackets, isolated on solid pure chroma green background #00FF00, textless, blank surface, front facing flat UI container, clean edges. Use the attached images as the strict style reference for materials, colors and ornament language.`

#### Thẻ Bài Vai Trò (480x720, Khung Kín Tràn Mép, Có Title Plate Trống)
8. **`card_back.webp`**:
   > `dark occult tarot card back design, ornate gothic baroque symmetrical filigree border with bronze runes, dark midnight blue velvety center with mystical geometric golden moon crest, high detail 2D mobile game card back, the card frame fills the entire image edge to edge, no background outside the frame, rectangular canvas, textless, no letters. Use the attached images as the strict style reference for materials, colors and ornament language.`

9. **`card_wolf.webp`**:
   > `dark fantasy tarot card illustration of a ferocious snarling Werewolf under a misty blood moon, glowing yellow eyes, sharp fangs, dark gothic ornate bronze frame around the card, with an EMPTY blank ornamental title plate at the bottom, no text on it, the card frame fills the entire image edge to edge, no background outside the frame, rectangular canvas, rich painterly fantasy RPG style, textless. Use the attached images as the strict style reference for materials, colors and ornament language.`

10. **`card_demon_wolf.webp`**:
    > `dark fantasy tarot card illustration of a terrifying Demon Werewolf with crimson horns, burning red eyes, shadowy smoke and hellfire aura, intricate dark iron and barbed thorns card frame, with an EMPTY blank ornamental title plate at the bottom, no text on it, the card frame fills the entire image edge to edge, no background outside the frame, rectangular canvas, menacing sinister composition, textless. Use the attached images as the strict style reference for materials, colors and ornament language.`

11. **`card_seer.webp`**:
    > `mystical gothic tarot card illustration of a hooded female Seer with violet robes, glowing third eye on forehead and floating arcane purple divination eyes, ornate baroque filigree frame, with an EMPTY blank ornamental title plate at the bottom, no text on it, the card frame fills the entire image edge to edge, no background outside the frame, rectangular canvas, dark amethyst color palette, textless. Use the attached images as the strict style reference for materials, colors and ornament language.`

12. **`card_witch.webp`**:
    > `dark fantasy tarot card illustration of an enchanting Witch holding two glowing alchemical glass flasks, one bubbling with emerald healing potion and one with virulent purple poison, misty cauldron smoke, ornate gothic frame, with an EMPTY blank ornamental title plate at the bottom, no text on it, the card frame fills the entire image edge to edge, no background outside the frame, rectangular canvas, textless. Use the attached images as the strict style reference for materials, colors and ornament language.`

13. **`card_guard.webp`**:
    > `heroic gothic tarot card illustration of an armored Paladin Guardian knight holding a glowing steel tower shield with angelic crest, protective golden aura, stoic medieval warrior, ornate bronze filigree card frame, with an EMPTY blank ornamental title plate at the bottom, no text on it, the card frame fills the entire image edge to edge, no background outside the frame, rectangular canvas, textless. Use the attached images as the strict style reference for materials, colors and ornament language.`

14. **`card_hunter.webp`**:
    > `dark fantasy tarot card illustration of a grim vigilant Hunter drawing a heavy wooden crossbow, wearing a worn leather hood and quiver of silver arrows, dark forest background, ornate gothic frame, with an EMPTY blank ornamental title plate at the bottom, no text on it, the card frame fills the entire image edge to edge, no background outside the frame, rectangular canvas, textless. Use the attached images as the strict style reference for materials, colors and ornament language.`

15. **`card_villager.webp`**:
    > `medieval gothic tarot card illustration of a humble rustic Villager holding a lantern in dark foggy village, rugged wool tunic, resilient expression, dark fantasy baroque card frame, with an EMPTY blank ornamental title plate at the bottom, no text on it, the card frame fills the entire image edge to edge, no background outside the frame, rectangular canvas, textless. Use the attached images as the strict style reference for materials, colors and ornament language.`

#### Bộ Icon MVP (Chroma Green #00FF00)
16. **`icon_skull.webp`**:
    > `carved dark gothic silver and stone human skull icon, deep sunken shadowed eyes, subtle red gem accent, game UI token icon, isolated on solid pure chroma green background #00FF00, crisp clean edges, textless. Use the attached images as the strict style reference for materials, colors and ornament language.`

17. **`icon_moon.webp`**:
    > `ornate mystical crescent moon game icon, carved antiqued silver filigree with tiny amethyst violet crystal inlay, game UI badge token, isolated on solid pure chroma green background #00FF00, clean sharp cutout edges, textless. Use the attached images as the strict style reference for materials, colors and ornament language.`

18. **`icon_potion_heal.webp`**:
    > `alchemical glass potion bottle containing glowing bubbling vibrant emerald green healing liquid, cork stopper with brass filigree, fantasy game UI item icon, isolated on solid pure chroma green background #00FF00, clean sharp edges, textless. Use the attached images as the strict style reference for materials, colors and ornament language.`

19. **`icon_potion_poison.webp`**:
    > `sinister alchemical flask containing bubbling luminous toxic dark purple poison with faint skull vapor mist, ornate dark bronze neck, fantasy game UI item icon, isolated on solid pure chroma green background #00FF00, clean sharp edges, textless. Use the attached images as the strict style reference for materials, colors and ornament language.`

20. **`icon_eye.webp`**:
    > `mystical arcane divination eye icon, glowing violet iris, surrounded by gothic bronze filigree and occult radiating light rays, game UI token icon, isolated on solid pure chroma green background #00FF00, clean sharp edges, textless. Use the attached images as the strict style reference for materials, colors and ornament language.`

---

## 7. DANH SÁCH ẢNH THAM KHẢO LƯU TRỮ TẠI `design/reference/`

Toàn bộ ảnh này đã được chuyển khỏi `public/` và lưu trữ an toàn trong `design/reference/`. Tuyệt đối không nhúng trực tiếp vào bundle:
- `design/reference/UI_kit.png`
- `design/reference/Gemini_Generated_Image_2owt0i2owt0i2owt.png`
- `design/reference/home.png`, `set_up.png`, `detail.png`
- `design/reference/night_phase.png`, `seer_phase.png`, `witch_phase.png`
- `design/reference/dawn_announcement.png`, `discussion.png`, `vote_voteResult.png`
- `design/reference/wingame.png`, `history.png`, `history_detail.png`
- `design/reference/front_back_card.png`, `back_card.png`
- `design/reference/*.png` (`wolf.png`, `demonWolf.png`, `seer.png`, `witch.png`, `guardian.png`, `hunter.png`, `human.png`)

---

## 8. THỨ TỰ TRIỂN KHAI TỪNG BƯỚC (ROADMAP NGHIÊM NGẶT)

### Bước 1: Refactor Bóc Tách Component (Zero Visual Risk)
*Quy tắc bắt buộc:* Sau mỗi lần tách một component, **DỪNG LẠI**, commit git riêng, chạy `npm run build` & `npm test`, sau đó cung cấp **kịch bản chơi thử thủ công** và **chờ user xác nhận "OK"** trước khi tách component tiếp theo:
- **Nhánh git làm việc:** `refactor-ui`
- **Tách `PlayPage.tsx`:**
  - Component 1: `NightPhaseController.tsx` (Xử lý các bước gọi role đêm)  
    ➔ Kịch bản test: Tạo ván 6 người, test đủ 4 vai đêm (Bảo vệ -> Sói -> Tiên tri -> Phù thủy).
  - Component 2: `DayDiscussionPanel.tsx` (Bảng đếm giờ và thảo luận)  
    ➔ Kịch bản test: Chuyển sang ngày, kiểm tra timer và danh sách nạn nhân đêm qua.
  - Component 3: `VotingTribunalPanel.tsx` (Bảng bỏ phiếu và kết quả treo cổ)  
    ➔ Kịch bản test: Bỏ phiếu cho 1 người, kiểm tra xử lý hòa phiếu và loại trừ.
  - Component 4: `GameEndSummary.tsx` (Màn hình thắng/thua)  
    ➔ Kịch bản test: Kích hoạt điều kiện thắng sói/dân làng, kiểm tra nút chơi lại.
- **Tách `HomePage.tsx`:**
  - Component 5: `ProfileModal.tsx` & `CreateRoomModal.tsx`
  - Component 6: `RoomListPanel.tsx`
- *Cam kết:* **Giữ nguyên 100% logic trong `src/game/`**.

### Bước 2: Nâng cấp Core Tokens & Font Tiếng Việt
- Nhúng font Google Fonts `Playfair Display` và `Be Vietnam Pro`.
- Cập nhật biến màu Dark Gothic theo mục 1.1 trong `src/styles/tokens.css`.
- Khai báo các art slot CSS variables.

### Bước 3: Thư viện Component CSS Thuần & Trang `/dev`
- Nâng cấp `GameButton` (Tactile 3D dập nổi với độ lún 2px khi bấm).
- Xây dựng component `ShieldAvatar.tsx` (Lớp avatar crop + Khung khiên đè lên trên).
- Xây dựng `HeaderRibbon.tsx` (Ruy-băng nền WebP kèm chữ tiếng Việt phủ lên).
- **Hoàn thiện trang `/dev` ([DevShowcasePage.tsx](src/pages/DevShowcasePage.tsx)):**
  - Chỉ render trong môi trường DEV: `{import.meta.env.DEV && <Route path="/dev" ... />}`
  - Tích hợp ô thử nghiệm Font chữ tiếng Việt hiển thị 3 cụm từ: `"HỘI ĐỒNG PHÁN XÉT"`, `"ĐÊM XUỐNG"`, `"THỢ SĂN"` song song bằng `Playfair Display` và `Be Vietnam Pro` kèm fallback font.
  - Trưng bày toàn bộ các component ở tất cả trạng thái (`default`, `:active`, `:selected`, `:disabled`, `:dead`) để kiểm tra trực quan độc lập.

### Bước 4: Nhập Asset Art MVP vào `public/art/`
- Chạy prompt AI để sinh 20 assets WebP MVP.
- Tách nền chroma green `#00FF00` (bật defringe để không lem viền xanh) và ô giữa `#FF00FF` cho `frame_shield.webp`.
- Kiểm tra dung lượng: nền ≤ 200KB, asset nhỏ ≤ 120KB.

### Bước 5: Đắp Skin vào các Route Game
- Áp dụng skin cho `RoomPage.tsx` (Lobby khiên hiệp sĩ).
- Áp dụng skin cho `PlayerLiveView.tsx` & `PlayPage.tsx` (Night Phase & Voting Tribunal).
- Kiểm tra toàn diện trên Safari iOS 15.

---

## 9. PHÂN TÍCH RỦI RO & QUY TẮC CSS SAFARI 15

### 9.1. Danh Sách Tính Năng CSS BỊ CẤM (Không dùng vì Safari 15 không hỗ trợ)
1. ❌ **`:has()`**: Chỉ hỗ trợ từ Safari 15.4+. Dùng class cha chủ động trong React.
2. ❌ **`color-mix()`**: Chỉ hỗ trợ từ Safari 16.2+. Khai báo mã màu hex/rgba rõ ràng.
3. ❌ **`@layer`**: Chỉ hỗ trợ từ Safari 15.4+.
4. ❌ **CSS Nesting native**: Chỉ hỗ trợ từ Safari 16.5+. Dùng CSS Modules thông thường.
5. ❌ **Đơn vị `dvh`, `lvh`, `svh`**: Chỉ hỗ trợ từ Safari 15.4+. Dùng `100vh` kết hợp `min-height: -webkit-fill-available`.
6. ❌ **`backdrop-filter: blur()` nặng**: Gây sụt khung hình trên chip A10 Fusion (iPhone 7 Plus). Thay bằng nền đục gradient `rgba(16, 20, 35, 0.9)`.

### 9.2. Kỹ Thuật Tách Nền Chroma Key Tránh Lem Viền (Defringe)
- Khi tách nền xanh lá `#00FF00` (và hồng `#FF00FF`), luôn bật chế độ **Defringe / Color Decontaminate (1-2px)** hoặc co vùng chọn vào trong 1px trước khi xóa.
- Luôn đặt asset đã tách nền lên phông nền tối (`#0B0C16`) để kiểm tra độ sạch viền trước khi lưu thành WebP.
