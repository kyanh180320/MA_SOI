# Kế hoạch MVP: Ứng dụng Quản trò Ma Sói

> Tài liệu này dùng để giao cho AI (hoặc developer) triển khai. Đọc hết phần 1-3 và 14 trước khi viết code. Làm lần lượt theo các **Task** ở phần 10, xong task nào phải đạt đủ **Tiêu chí hoàn thành** của task đó rồi mới sang task tiếp.

---

## 1. Tổng quan

**Sản phẩm:** Web app giúp một người làm **quản trò** cho game Ma Sói trên một thiết bị (offline). Ứng dụng chia vai, dẫn các pha đêm/ngày, xử lý kết quả, kiểm tra thắng thua và lưu lịch sử từng round.

**Mục tiêu MVP:** chơi được trọn một ván từ lúc nhập số người đến lúc có người thắng, và xem lại lịch sử. Ưu tiên chạy được và đúng luật hơn là đẹp.

**Người dùng:**
| Vai trò | Mô tả |
|---|---|
| Khách (chưa đăng nhập) | Chơi offline, lịch sử lưu trong `localStorage` |
| User | Đăng nhập bằng Google, lịch sử lưu lên Firestore theo `uid` |
| Admin | Đăng nhập email/mật khẩu, quản lý danh sách tên người chơi mặc định |

---

## 2. Phạm vi MVP

### Có làm
1. Chế độ offline: nhập số người chơi, tự chia vai bằng thuật toán cân bằng.
2. Vai trò: **Sói, Dân thường, Tiên tri, Phù thủy**.
3. Vòng lặp game: đêm → sáng → thảo luận → bỏ phiếu → kiểm tra thắng.
4. Lịch sử từng round trong một trận (đêm xảy ra gì, ai chết, kết quả bỏ phiếu).
5. Đăng nhập: Google cho user, email/mật khẩu cho admin, phân quyền admin/user.
6. Admin nhập sẵn danh sách tên người chơi mặc định để chọn nhanh khi tạo ván.
7. Lưu lịch sử các trận lên Firestore cho user đã đăng nhập.

### Không làm (để sau)
Multiplayer mỗi người một máy, bot đọc giọng nói, các vai khác (thợ săn, bảo vệ, cupid...), thống kê tỉ lệ thắng, đa phòng, thông báo đẩy, PWA.

---

## 3. Tech stack và ràng buộc

| Hạng mục | Lựa chọn |
|---|---|
| Framework | React 18 + TypeScript (strict mode) + Vite |
| Routing | React Router |
| State | `useState` / `useReducer` / Context. **Không dùng Redux** |
| Backend | Firebase: Authentication (Google, Email/Password), Firestore, Hosting |
| Lưu offline | `localStorage` |
| Style | CSS thuần hoặc CSS Modules. Không cần thư viện UI nặng |
| Test | Vitest, **chỉ test phần logic game** (phần 4, 5) |

**Ràng buộc quan trọng:**
- **Tương thích Safari/iOS 15** (thiết bị chính để test là iPhone 7 Plus). Đặt `build.target: ['es2020', 'safari15']` trong `vite.config.ts`. Không dùng API quá mới (ví dụ Screen Wake Lock, `structuredClone` cần kiểm tra).
- **Giao diện ưu tiên điện thoại**: nút lớn, chữ dễ đọc, một cột.
- **Logic game phải là hàm thuần TypeScript**, nằm trong `src/game/`, **không import React hay Firebase**. Giao diện chỉ gọi các hàm này.
- Mọi hằng số luật chơi (số bình thuốc, có được tự cứu không...) đặt trong một file config duy nhất, dễ chỉnh.

---

## 4. Luật game (đặc tả cho rules engine)

### 4.1 Vai trò
| Vai | Phe | Khả năng |
|---|---|---|
| Sói | Sói | Mỗi đêm cùng chọn 1 người để cắn |
| Dân thường | Dân | Không có khả năng, chỉ bỏ phiếu |
| Tiên tri | Dân | Mỗi đêm kiểm tra 1 người, biết người đó **có phải sói không** |
| Phù thủy | Dân | Có **1 bình cứu** và **1 bình độc**, mỗi bình dùng một lần cả ván |

### 4.2 Thứ tự một đêm
1. **Sói** chọn nạn nhân.
2. **Tiên tri** chọn người kiểm tra, hệ thống trả về `isWolf`.
3. **Phù thủy** được cho biết nạn nhân của sói, rồi chọn:
   - Dùng bình cứu cho nạn nhân (nếu còn bình)
   - Dùng bình độc cho một người bất kỳ còn sống (nếu còn bình)
   - Hoặc không làm gì
4. **Xử lý kết quả đêm:**
   - Nạn nhân của sói chết, **trừ khi** được cứu.
   - Người bị đầu độc chết.
   - Danh sách `nightDeaths` là hợp của hai nhóm trên (không trùng).

> Nếu vai nào đã chết hoặc không có trong ván thì **bỏ qua bước của vai đó**. Quản trò vẫn thấy bước đó để giữ nhịp, nhưng đánh dấu "không có người thực hiện" (tránh để lộ ai còn sống vai gì).

### 4.3 Ban ngày
1. Công bố người chết đêm qua (hoặc "đêm qua bình yên").
2. Kiểm tra thắng thua. Nếu đã có kết quả thì kết thúc.
3. Thảo luận (có thể có đồng hồ đếm giờ tùy chọn, không bắt buộc ở MVP).
4. **Bỏ phiếu:** quản trò nhập số phiếu cho từng người hoặc chọn người bị loại. Người nhiều phiếu nhất bị loại.
5. **Hòa phiếu:** không ai bị loại (mặc định, có thể đổi trong config).
6. Kiểm tra thắng thua. Nếu chưa kết thúc, sang đêm tiếp theo.

### 4.4 Điều kiện thắng
- **Dân thắng:** không còn sói còn sống.
- **Sói thắng:** số sói còn sống **≥** số người không phải sói còn sống.

### 4.5 Config luật (đặt trong `src/game/config.ts`)
```ts
export const RULES = {
  minPlayers: 6,
  maxPlayers: 20,
  witch: { saveCount: 1, poisonCount: 1 },
  witchCanSaveSelf: true,
  witchCanUseBothInOneNight: false,
  tieVoteEliminatesNobody: true,
} as const;
```

---

## 5. Thuật toán cân bằng (chia vai)

Với `n` là số người chơi (`minPlayers` ≤ n ≤ `maxPlayers`):

```
wolves   = max(2, floor(n / 3))
seer     = 1                      (n >= 6)
witch    = n >= 7 ? 1 : 0
villager = n - wolves - seer - witch
```

| n | Sói | Tiên tri | Phù thủy | Dân |
|---|---|---|---|---|
| 6 | 2 | 1 | 0 | 3 |
| 7 | 2 | 1 | 1 | 3 |
| 9 | 3 | 1 | 1 | 4 |
| 12 | 4 | 1 | 1 | 6 |
| 15 | 5 | 1 | 1 | 8 |

**Yêu cầu:**
- Hàm `getRoleDistribution(n): Record<Role, number>` trả về bảng trên.
- Hàm `assignRoles(players, distribution): Player[]` xáo trộn ngẫu nhiên bằng **Fisher-Yates** (không dùng `sort(() => Math.random() - 0.5)`).
- Cho phép quản trò **chỉnh tay** số lượng từng vai trước khi bắt đầu, miễn tổng bằng `n` và có ít nhất 1 sói.

---

## 6. Mô hình dữ liệu

```ts
export type Role = "wolf" | "villager" | "seer" | "witch";
export type Phase = "setup" | "night" | "day" | "vote" | "ended";

export interface Player {
  id: string;
  name: string;
  role: Role;
  alive: boolean;
}

export interface Round {
  number: number;
  wolfTarget?: string;
  seerCheck?: { target: string; isWolf: boolean };
  witchSaved?: boolean;
  witchPoisonTarget?: string;
  nightDeaths: string[];                 // id người chết trong đêm
  vote?: {
    tally: Record<string, number>;       // id -> số phiếu
    eliminated?: string;                 // id bị loại, undefined nếu hòa
  };
}

export interface Game {
  id: string;
  createdAt: number;
  players: Player[];
  rounds: Round[];
  phase: Phase;
  witchItems: { saveLeft: number; poisonLeft: number };
  winner?: "wolf" | "villager";
}

export interface AppUser {
  uid: string;
  displayName: string;
  email: string;
  role: "admin" | "user";
}

export interface PresetName {
  id: string;
  name: string;
}
```

**Firestore:**
```
users/{uid}                 -> { displayName, email, role: "admin" | "user" }
users/{uid}/games/{gameId}  -> Game
presetNames/{id}            -> { name }
```

---

## 7. Cấu trúc thư mục

```
src/
  game/                  # LOGIC THUẦN, không import React/Firebase
    config.ts
    types.ts
    roles.ts             # getRoleDistribution, assignRoles
    night.ts             # resolveNight
    vote.ts              # resolveVote
    win.ts               # checkWinner
    *.test.ts
  services/
    firebase.ts          # khởi tạo Firebase
    authService.ts
    gameRepository.ts    # lưu/đọc game (localStorage hoặc Firestore)
    presetNameService.ts
  context/
    AuthContext.tsx
    GameContext.tsx
  pages/
    HomePage.tsx
    SetupPage.tsx
    PlayPage.tsx
    HistoryPage.tsx
    LoginPage.tsx
    AdminPage.tsx
  components/
  App.tsx
  main.tsx
```

---

## 8. Xác thực và phân quyền

### 8.1 User thường
- Đăng nhập bằng **Google** (Firebase Auth `signInWithPopup`; nếu popup lỗi trên iOS thì dùng `signInWithRedirect`).
- Lần đầu đăng nhập: tạo `users/{uid}` với `role: "user"`.

### 8.2 Admin
> **Lưu ý bảo mật quan trọng:** Không hardcode `admin / admin123` trong source code. Code React chạy ở trình duyệt nên ai cũng đọc được mật khẩu qua DevTools, và `admin123` là mật khẩu dễ đoán nhất.

**Cách làm đúng nhưng vẫn nhanh:**
1. Trong Firebase Console, bật **Email/Password**, tạo thủ công 1 tài khoản admin (email thật, mật khẩu mạnh).
2. Trong Firestore, tạo `users/{uid của admin}` với `role: "admin"`.
3. Trang `LoginPage` có tab "Admin" đăng nhập bằng email/mật khẩu.
4. Quyền admin được xác định bằng đọc `users/{uid}.role`, **và quan trọng nhất là được ép bằng Security Rules**, không chỉ ẩn nút ở giao diện.

*(Nếu chỉ chạy local để demo nội bộ và chủ dự án yêu cầu bằng được tài khoản mặc định, có thể dùng Firebase Emulator hoặc seed script chỉ chạy ở môi trường dev. Tuyệt đối không deploy lên hosting công khai.)*

### 8.3 Security Rules (Firestore)
```
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {

    function isSignedIn() { return request.auth != null; }
    function isAdmin() {
      return isSignedIn() &&
        get(/databases/$(database)/documents/users/$(request.auth.uid)).data.role == 'admin';
    }

    match /users/{uid} {
      allow read: if isSignedIn() && (request.auth.uid == uid || isAdmin());
      // user tự tạo hồ sơ của mình nhưng chỉ được đặt role = 'user'
      allow create: if isSignedIn() && request.auth.uid == uid
                    && request.resource.data.role == 'user';
      // không cho tự đổi role
      allow update: if isSignedIn() && request.auth.uid == uid
                    && request.resource.data.role == resource.data.role;

      match /games/{gameId} {
        allow read, write: if isSignedIn() && request.auth.uid == uid;
      }
    }

    match /presetNames/{id} {
      allow read: if true;
      allow write: if isAdmin();
    }
  }
}
```

---

## 9. Màn hình và luồng

| Route | Màn hình | Nội dung chính |
|---|---|---|
| `/` | Trang chủ | Nút "Ván mới", "Lịch sử", "Đăng nhập" |
| `/setup` | Chuẩn bị | Nhập số người, nhập hoặc chọn tên từ danh sách mặc định, xem và chỉnh bảng chia vai, nút "Chia vai" |
| `/play` | Chơi | Quản trò xem vai (bấm để hiện, bấm lại ẩn), luồng đêm/ngày/bỏ phiếu, danh sách sống/chết |
| `/history` | Lịch sử | Danh sách các trận, bấm vào xem từng round |
| `/login` | Đăng nhập | Nút Google, tab Admin |
| `/admin` | Admin | CRUD danh sách tên mặc định. Chỉ truy cập được khi `role === "admin"` |

**Luồng chơi:**
`Setup → Chia vai → [Đêm → Sáng → Bỏ phiếu] lặp lại → Kết thúc (hiện người thắng + toàn bộ vai) → Lưu lịch sử`

**Yêu cầu giao diện:**
- Màn hình "xem vai" phải có nút ẩn nhanh để tránh lộ vai khi đưa máy cho người khác.
- Mỗi bước đêm có thông tin rõ ràng quản trò cần đọc ("Sói thức dậy, chọn người cắn").
- Có nút **Hoàn tác** bước vừa làm (tối thiểu bước chọn trong đêm hiện tại) vì quản trò rất hay bấm nhầm.
- Tự lưu trạng thái ván vào `localStorage` sau mỗi bước để tải lại trang không mất.

---

## 10. Danh sách Task (làm theo thứ tự)

### Task 1: Khởi tạo dự án
- Vite + React + TypeScript strict, cài React Router, Vitest, Firebase SDK.
- Cấu hình `build.target` cho Safari 15.
- Cấu trúc thư mục theo phần 7.
- Chưa dùng Firebase thật, để biến môi trường `.env` (và thêm `.env` vào `.gitignore`).

**Hoàn thành khi:** `npm run dev` và `npm run build` chạy không lỗi, `tsc --noEmit` sạch.

### Task 2: Logic game thuần (quan trọng nhất)
- Viết `types.ts`, `config.ts`, `roles.ts`, `night.ts`, `vote.ts`, `win.ts` theo phần 4, 5, 6.
- Viết unit test (Vitest) cho:
  - `getRoleDistribution` với n = 6, 7, 9, 12, 15 và các giá trị ngoài khoảng cho phép.
  - `assignRoles` giữ đúng số lượng từng vai.
  - `resolveNight`: sói cắn + cứu (sống), sói cắn không cứu (chết), độc + cắn khác người (chết hai), cứu và độc cùng một người, bình đã hết.
  - `resolveVote`: người nhiều phiếu nhất bị loại, hòa phiếu.
  - `checkWinner`: dân thắng, sói thắng, chưa kết thúc.

**Hoàn thành khi:** `npm test` xanh, các hàm không import React hay Firebase.

### Task 3: Màn hình Setup và chia vai
- Nhập số người, nhập tên (hoặc để mặc định "Người chơi 1, 2, ...").
- Hiển thị bảng chia vai từ `getRoleDistribution`, cho chỉnh tay có kiểm tra hợp lệ.
- Nút "Chia vai" tạo `Game` mới với `phase = "night"`.

**Hoàn thành khi:** nhập 9 người, ra đúng 3 sói, 1 tiên tri, 1 phù thủy, 4 dân, mỗi người có vai.

### Task 4: Màn hình Chơi (vòng lặp game)
- Xem vai từng người (có ẩn nhanh).
- Luồng đêm theo 4.2, luồng ngày và bỏ phiếu theo 4.3.
- Danh sách sống/chết cập nhật đúng. Màn hình kết thúc hiện người thắng và toàn bộ vai.
- Hoàn tác bước vừa làm. Tự lưu `localStorage` mỗi bước.

**Hoàn thành khi:** chơi trọn một ván 7 người từ đầu đến khi có phe thắng, không lỗi, tải lại trang giữa ván vẫn tiếp tục được.

### Task 5: Lịch sử round
- Mỗi round ghi vào `game.rounds` đúng như mô hình ở phần 6.
- Màn hình `/history`: danh sách trận (ngày giờ, số người, phe thắng), bấm vào xem từng round (ai bị cắn, tiên tri soi ai và kết quả, phù thủy dùng gì, ai chết, kết quả bỏ phiếu).
- Khách lưu ở `localStorage`.

**Hoàn thành khi:** chơi xong một ván thì xem lại được đầy đủ từng round, không thiếu bước nào.

### Task 6: Đăng nhập và phân quyền
- Cấu hình Firebase thật, `AuthContext`.
- Đăng nhập Google, tạo `users/{uid}` lần đầu. Tab đăng nhập admin bằng email/mật khẩu.
- Route `/admin` được bảo vệ, user thường truy cập sẽ bị chuyển hướng.
- Áp dụng Security Rules ở phần 8.3.

**Hoàn thành khi:** user Google vào được app nhưng không vào được `/admin`, admin vào được. Thử ghi `presetNames` bằng tài khoản user thường thì bị từ chối bởi Rules.

### Task 7: Tên người chơi mặc định (admin)
- Trang `/admin`: thêm, sửa, xóa tên trong `presetNames`.
- Ở `/setup`: chọn nhanh từ danh sách mặc định (chọn nhiều), vẫn cho nhập tay thêm.
- Cache danh sách vào `localStorage` để dùng khi offline.

**Hoàn thành khi:** admin thêm 5 tên, ở màn setup thấy 5 tên đó và chọn được. Mất mạng vẫn dùng được bản cache.

### Task 8: Lưu lịch sử lên Firestore
- `gameRepository` có hai chế độ: chưa đăng nhập thì `localStorage`, đã đăng nhập thì Firestore `users/{uid}/games`.
- Khi đăng nhập lần đầu, hỏi người dùng có muốn đẩy các trận đang có ở `localStorage` lên tài khoản không.

**Hoàn thành khi:** đăng nhập trên máy khác vẫn thấy lịch sử cũ.

### Task 9: Deploy và rà soát
- Deploy Firebase Hosting.
- Test thực tế trên Safari iPhone: đăng nhập Google, chơi một ván, xem lịch sử.
- Rà soát: không còn secret trong source, `.env` không bị commit, Rules đã deploy.

**Hoàn thành khi:** có link public, một ván chơi trọn vẹn trên điện thoại.

---

## 11. Tiêu chí chất lượng chung

- TypeScript strict, không dùng `any` trừ khi có comment giải thích.
- Hàm logic game không có side effect và không phụ thuộc thời gian hay ngẫu nhiên bên ngoài (nhận seed hoặc hàm random làm tham số để test được).
- Mỗi task kết thúc bằng một commit rõ nghĩa (ví dụ `feat: night resolution logic + tests`).
- Không thêm thư viện ngoài danh sách phần 3 nếu chưa có lý do rõ và đã ghi chú trong PR/commit.

---

## 12. Các giả định (cần chủ dự án xác nhận)

AI cứ làm theo giả định mặc định bên dưới, đã đặt trong `config.ts` để dễ đổi.

| # | Câu hỏi | Giả định mặc định |
|---|---|---|
| 1 | Phù thủy có bao nhiêu bình? | 1 bình cứu + 1 bình độc (yêu cầu gốc ghi "2 bình độc và bình cứu", cần xác nhận) |
| 2 | Phù thủy có tự cứu mình được không? | Có |
| 3 | Dùng cả hai bình trong một đêm? | Không |
| 4 | Hòa phiếu thì sao? | Không ai bị loại |
| 5 | Số người tối thiểu và tối đa? | 6 và 20 |
| 6 | Tài khoản admin | Tạo qua Firebase Console, không hardcode `admin123` |

---

## 13. Hướng mở rộng sau MVP

1. Đồng hồ đếm giờ thảo luận và bot đọc lời dẫn (`speechSynthesis`).
2. Thêm vai: Thợ săn, Bảo vệ, Cupid.
3. Multiplayer mỗi người một máy bằng Firestore realtime (`onSnapshot`).
4. Thống kê: tỉ lệ thắng theo phe và theo người chơi.
5. PWA để thêm vào màn hình chính.

---

## 14. Quy tắc làm việc dành cho AI

1. **Đọc hết tài liệu trước khi code.** Nếu có điểm mâu thuẫn hoặc thiếu thông tin, hỏi lại hoặc dùng giả định ở phần 12 và ghi chú rõ.
2. **Làm lần lượt từng task**, không nhảy cóc. Mỗi task xong phải chạy được, có test (với phần logic), rồi mới sang task tiếp.
3. **Không tự ý mở rộng phạm vi** ra ngoài phần 2. Ý tưởng hay thì ghi vào phần 13, không code.
4. **Logic game đặt trong `src/game/`, không phụ thuộc React hay Firebase.**
5. **Bảo mật:** không hardcode mật khẩu hay khóa bí mật, không commit `.env`, quyền truy cập luôn được ép bằng Security Rules.
6. **Cuối mỗi task**, báo cáo ngắn gồm: đã làm gì, file nào thay đổi, cách chạy và kiểm tra, điểm chưa chắc chắn hoặc cần người quyết định.
