export const GUIDELINE_TABS = ['main', 'classic', 'challenge', 'platformer'] as const;
export type GuidelineTab = (typeof GUIDELINE_TABS)[number];

export const DEFAULT_GUIDELINES_MAIN = '';

export const DEFAULT_GUIDELINES_CLASSIC = `# GDVN Classic List Guideline
> Quy định được chuyển tiếp từ bộ quy tắc của AREDL và Pointercrate.
> Quy định vẫn đang được chỉnh sửa và phát triển!

## 1. Quy Định Chung
- Bắt buộc phải có Raw Footage cho toàn bộ Extreme Demon.
- Độ phân giải tối thiểu cho video là 480p 30fps.
- Video hoàn thành (completion video) và video gốc chưa qua chỉnh sửa (raw footage) của bạn phải nghe rõ toàn bộ tiếng click chuột/phím trong suốt quá trình hoàn thành màn chơi.
- Bạn phải quay lại và tải video hoàn thành của mình lên YouTube hoặc một nền tảng chia sẻ video khác.
- Nếu video của bạn được tải lên sau ngày 02 tháng 07 năm 2023, record của bạn phải hiển thị tất cả các cheat indicator trên màn hình kết thúc (endscreen) của màn chơi.
- Record của bạn phải hiển thị các thông số trên endscreen (attempts, orbs,...).
- Raw footage của bạn phải có tiếng click được tách riêng (isolated clicks) và nộp kèm cùng với video công khai của bạn.
- Record của bạn không được sử dụng bất kỳ bản mod nào bị cấm.
- Trong quá trình hoàn thành, bạn không được sử dụng bất kỳ lỗi bỏ qua đoạn (skips) làm cho bất kỳ phần nào của màn chơi trở nên dễ hơn đáng kể.
- Lưu ý rằng một số quy định này có thể được miễn trừ nếu record của bạn được thực hiện trước một mốc thời gian nhất định; bạn có thể đọc thêm chi tiết ở bên dưới.

### 1.1. Trường Hợp Ngoại Lệ (Exceptions)
Một số quy tắc có thể được bỏ qua nếu record được xác nhận là hoàn thành trước một mốc thời gian cụ thể, thông thường là thời điểm quy tắc đó bắt đầu có hiệu lực. Ngày hoàn thành được xác định theo ngày tải video lên, tuy nhiên nếu bạn có bằng chứng xác thực không thể chối cãi chứng minh điều ngược lại, bạn có thể đề cập trong phần Ghi Chú khi nộp record. Nếu record của bạn thuộc diện ngoại lệ, vui lòng ghi rõ để đội ngũ list chú ý.

### 1.2. Nghiêm Cấm Lách Luật (Loopholes)
Người chơi không được lợi dụng bất kỳ lỗ hổng nào trong các hướng dẫn này. Nếu bạn sử dụng kẽ hở để tránh bị coi là phạm luật, record vẫn sẽ bị xử lý như khi vi phạm quy tắc đó. Đội ngũ quản lý list sẽ tự xem xét và quyết định hành vi nào được tính là lách luật tùy theo từng trường hợp cụ thể, dựa trên các yếu tố như việc lợi dụng lỗ hổng đó có mang lại lợi thế tương tự như hành vi vi phạm một quy tắc đã nêu rõ hay không.

## 2. Quy Định Về Tiếng Click (Clicks)
Video hoàn thành và raw footage của bạn phải nghe rõ toàn bộ tiếng click trong suốt quá trình hoàn thành. Rất hiếm khi có ngoại lệ cho quy tắc này, vì việc nghe tiếng click là một phần không thể thiếu trong quy trình xét duyệt record. Record của bạn có thể bị từ chối nếu tiếng click quá nhỏ dù về mặt kỹ thuật vẫn có thể nghe thấy, vì đội ngũ list sẽ rất khó phân biệt chúng với nhạc nền của màn chơi.

### 2.1. Ngoại Lệ Cho Tiếng Click
Nếu record của bạn được xác nhận trước ngày 25 tháng 08 năm 2020, bạn được miễn trừ quy tắc này. Vui lòng đọc thêm thông tin về các trường hợp ngoại lệ tại đây.
Record của bạn không cần tuân theo quy tắc này nếu nó đã được chấp nhận trên Pointercrate.

### 2.2. Xử Lý Khi Tắt Hoặc Xóa Tiếng Click (Removing Clicks)
Bạn được phép tắt/cắt âm thanh micro khỏi video công khai của mình, miễn là bạn nộp kèm một video có âm thanh gốc chưa chỉnh sửa tại mục “Raw Footage” trong biểu mẫu gửi record. Trong trường hợp này, cả hai video đều phải tuân theo quy tắc “Xóa video”, nghĩa là đội ngũ list phải luôn truy cập được cả hai video. Chúng tôi khuyên bạn nên ghi rõ điều này trong phần Ghi Chú nếu áp dụng cách trên.

### 2.3. Vấn Đề Về Thiết Bị & Micro (Microphone Issues)
Nếu micro của bạn có tính năng lọc ồn tích hợp (built-in noise cancellation), noise gate hoặc bất kỳ tính năng nào khác có thể làm mất tạp âm nền/âm thanh nhỏ, hoặc không thu được tiếng click một cách ổn định, vui lòng kiểm tra kỹ để đảm bảo tiếng click vẫn nghe rõ khi bật tính năng đó. Nếu tính năng này làm cho tiếng click bị quá nhỏ, hoặc hầu hết đều nghe được nhưng bị ngắt quãng vài tiếng, record của bạn có thể bị từ chối.
Để khắc phục, bạn có thể thử tắt hoàn toàn tính năng này, đặt micro gần thiết bị thao tác hơn hoặc ghi lại tiếng click bằng một thiết bị riêng biệt như điện thoại. Nếu dùng điện thoại để thu âm tiếng click, hãy ghi rõ trong Ghi Chú kèm theo link tải bản ghi âm đó.

### 2.4. Các Phương Án Thay Thế Không Được Chấp Nhận
Có một số quan niệm sai lầm về các phương pháp thay thế cho tiếng click thực tế. Âm thanh click duy nhất chúng tôi chấp nhận là âm thanh thu từ micro.
Clickbot (các bản mod tạo âm thanh click nhân tạo như Click Sounds, ZCB Live, hoặc bất kỳ clickbot nào tích hợp trong phần mềm macro,...), CPS Counter (bộ đếm số click mỗi giây), mod Inputs Viewer,... không thể thay thế cho việc thu âm tiếng click thực tế, vì chúng có thể bị can thiệp bởi công cụ của bên thứ ba.
Lưu ý rằng việc sử dụng clickbot bị cấm hoàn toàn trong các bản ghi record, kể cả khi video của bạn có kèm tiếng click thật. Bạn có thể đọc thêm về các mod bị cấm tại đây.

## 3. Quy Định Đăng Tải & Định Dạng Video (Uploading)
Trước khi nộp record, bạn phải quay và tải video hoàn thành lên một nền tảng chia sẻ video được hỗ trợ. Nội dung và gameplay trong video này phải tuân thủ tất cả các hướng dẫn của chúng tôi. Chúng tôi khuyên bạn nên dùng OBS để ghi lại micro, âm thanh hệ thống và toàn bộ cửa sổ trò chơi.
Lưu ý rằng raw footage (nếu bắt buộc) sẽ tuân theo một bộ quy tắc khác so với video công khai. Bạn có thể đọc thêm về raw footage tại đây.
Nếu sử dụng webcam, vui lòng đảm bảo webcam không che khuất các phần quan trọng của game (ví dụ: cheat indicators, icon nhân vật và/hoặc phần gameplay chính, watermark của CBF ở góc trên bên phải,...).

### 3.1. Yêu Cầu Đối Với Màn Chơi Tàng Hình (Invisible Levels)
Đối với các màn chơi có gameplay chủ yếu là vô hình (như Ambrosia hay M A N I X), người chơi bắt buộc phải nộp raw footage kèm theo video quay trực tiếp màn hình máy tính từ bên ngoài (liveplay).

### 3.2. Nền Tảng Video Hợp Lệ (Video Platforms)
Dưới đây là danh sách các trang web mà AREDL/GDVN cho phép bạn tải video hoàn thành lên. Trang nộp record sẽ không cho phép bạn nộp với một liên kết không hợp lệ:
- YouTube
- Google Drive

### 3.3. Tỷ Lệ Khung Hình Video (Video Dimensions)
Các record được quay bằng phần mềm màn hình và nộp dưới định dạng khung hình dọc sẽ không được chấp nhận, trừ khi có video bổ sung quay ngang được cung cấp trong mục raw footage ở trang gửi record. Quy định này áp dụng cho các video nộp qua các nền tảng như TikTok, YouTube Shorts và Instagram Reels. Ngoài ra, bạn không được nộp video ngang lên một nền tảng ép video về tỷ lệ khung hình dọc, trừ khi bạn cung cấp thêm video bổ sung đáp ứng các yêu cầu về raw footage như đã nêu.

### 3.4. Quy Định Xóa Video (Video Deletion)
Không được xóa video hoàn thành sau khi record đã được chấp nhận. Bạn có thể để video ở chế độ Không công khai (Unlisted) trên YouTube, nhưng đội ngũ list phải luôn có thể xem lại video bất cứ lúc nào nếu cần. Các record có video bị xóa sẽ bị gỡ bỏ khỏi list. Lưu ý rằng bạn được phép xóa raw footage, nhưng không được xóa video công khai gắn liền với record.

### 3.5. Quay Trực Tiếp Màn Hình (Liveplays)
“Liveplay” là hình thức dùng camera bên ngoài để quay lại màn hình máy tính của bạn. Liveplay được phép sử dụng cho các record, miễn là tuân thủ các hướng dẫn tương tự như các bản quay màn hình thông thường. Vui lòng đảm bảo cửa sổ game và màu sắc hiển thị rõ ràng, không có vật cản phía trước camera che mất màn hình. Nếu đội ngũ list không thể nhìn rõ màu sắc của cheat indicator, record của bạn sẽ bị từ chối!
*Ngoại lệ:* Liveplays (video được quay bằng camera ngoài như điện thoại) được miễn trừ khỏi quy tắc về tỷ lệ khung hình video.

## 4. Phiên Bản Game & Máy Chủ (Versions & GDPS)
- **Phiên bản game:** Nếu bạn chơi trên một phiên bản Geometry Dash không phải bản mới nhất, bạn phải tuân theo hướng dẫn dành cho các record ở phiên bản đó. Đối với các record được thực hiện ở các phiên bản trước 2.2, bộ đếm FPS (FPS counter) bắt buộc phải hiển thị và tốc độ khung hình không được vượt quá 360 FPS. Quy định này áp dụng cho cả việc dùng tần số quét màn hình gốc lẫn các công cụ Bypass FPS hoặc TPS.
- **Máy chủ riêng (GDPS):** Nếu bạn chơi trên một máy chủ riêng (GDPS), record của bạn sẽ được xử lý như thể được chơi trên phiên bản GD gốc mà GDPS đó dựa trên. Ví dụ: các GDPS phiên bản 2.1 phải tuân theo quy tắc của 2.1 (phải hiển thị FPS counter, FPS/TPS phải từ 360 trở xuống).

## 5. Cheat Indicators
Nếu record của bạn sử dụng một hoặc nhiều bản hack/mod có cheat indicator ở endscreen, tất cả các chỉ báo này phải hiển thị rõ ràng và chứng minh không có gian lận nào được sử dụng trong lần hoàn thành đó.
Lưu ý rằng thuật ngữ “endscreen cheat indicator” ám chỉ cụ thể đến bất kỳ cheat indicator nào xuất hiện trên cửa sổ menu kết thúc xổ xuống sau khi hoàn thành màn chơi. Quy định này không áp dụng cho cheat indicator hiển thị xuyên suốt màn chơi nếu nó không nằm trên cửa sổ endscreen.

### 5.1. Ngoại Lệ Về Cheat Indicators
Do sự phát triển gần đây của cộng đồng mod Geometry Dash và tính tùy chọn của các mod ngoài, có một vài ngoại lệ cho quy tắc này:
- Record của bạn không cần tuân theo quy tắc này nếu đã được chấp nhận trên Pointercrate.
- Nếu lần hoàn thành diễn ra trước ngày 02 tháng 07 năm 2023, bất kỳ mod menu nào được sử dụng đều không bắt buộc phải hiển thị cheat indicator. Chúng tôi định nghĩa “mod menu” là bất kỳ mod hoặc hack bên ngoài nào cung cấp một tập hợp các tính năng bật/tắt để tùy biến và can thiệp vào game (ví dụ: Mega Hack, QOLMod, Eclipse, Prism Menu,...).
- Nếu một bản hack/mod không có cheat indicator ở endscreen nhưng lại có cheat indicator hiển thị trong màn chơi (in-level), thì in-level cheat indicator đó bắt buộc phải hiển thị rõ ràng xuyên suốt lần hoàn thành của bạn.
- Nếu bạn sử dụng một bản mod/hack hiện có cheat indicator, nhưng lần hoàn thành diễn ra trước thời điểm cheat indicator đó được cập nhật vào mod, yêu cầu về cheat indicator đó sẽ được miễn trừ.
- Nếu bạn không sử dụng bất kỳ mod/hack nào có cheat indicator, record của bạn được miễn trừ khỏi quy tắc này.

## 6. Thông Số Màn Chơi (Level Stats)
Record của bạn phải hiển thị các thông số trên endscreen (attempts, stars, orbs, jumps, time,...). Tuy nhiên, nếu bạn đã từng hoàn thành màn chơi này nhiều hơn một lần, bạn bắt buộc phải ghi rõ điều đó trong Ghi Chú khi gửi.
Nếu bạn định nộp một lần beat lại (rebeat) của một màn chơi, chúng tôi đặc biệt khuyến khích bạn nên “Uncomplete” màn chơi thông qua các mod như Mega Hack hoặc các giải pháp miễn phí trên Geode như Eclipse. Điều này được khuyến khích vì việc không nhận được các thông số/phần thưởng trên endscreen là dấu hiệu của việc chơi trên bản copy và có thể gây ra nghi ngờ.
*Ngoại lệ:* Record của bạn không cần tuân theo quy tắc này nếu đã được chấp nhận trên Pointercrate.

## 7. Quy Định Về Raw Footage
Bạn bắt buộc phải nộp raw footage có track âm thanh tiếng click riêng biệt (isolated audio track) để đội ngũ list xem xét, bên cạnh một video công khai. Raw footage phải đạt tối thiểu 30 FPS.
“Raw footage” dùng để chỉ bản ghi âm/ghi hình gốc chưa qua chỉnh sửa của lần hoàn thành, được xuất trực tiếp từ phần mềm quay màn hình của bạn. Bạn tuyệt đối không được chỉnh sửa tệp này dưới bất kỳ hình thức nào trước khi nộp. Raw footage và mọi thông tin bên trong đó được xem là dữ liệu bảo mật của đội ngũ list và sẽ không bị chia sẻ ra bên ngoài. Ngược lại, bạn cũng cần hiểu rằng mình có thể vô tình để lộ các thông tin cá nhân khi cung cấp raw footage.

### 7.1. Tách Riêng Track Tiếng Click (Isolated Clicks)
Âm thanh micro của bạn (cụ thể là tiếng click) phải nằm trên một audio track riêng biệt và độc lập trong tệp raw footage. Điều này có nghĩa là một trong các track âm thanh phải chỉ ghi lại duy nhất âm thanh từ micro của bạn. Hướng dẫn thiết lập trên một số phần mềm:
- OBS
- Medal.tv
- GeForce Experience
Nếu sử dụng phần mềm khác, bạn có thể tìm kiếm hướng dẫn kích hoạt tách track âm thanh (split audio tracks). Nếu không thể quay với các track âm thanh riêng biệt, bạn có thể thu âm tiếng click riêng bằng một thiết bị khác và nộp cả hai tệp qua một thư mục Google Drive (hoặc tương đương). Cuối cùng, bạn cũng có thể cài đặt để video chỉ phát duy nhất tiếng micro (đây chỉ là giải pháp đường cùng).

### 7.2. Phương Thức Tải Lên Raw Footage
- **Tải tệp tin (Khuyến nghị):** Để nộp raw footage, bạn phải tải nó lên theo cách cho phép chúng tôi truy cập vào tệp gốc. Chúng tôi khuyến nghị bạn dùng Google Drive (hoặc bất kỳ dịch vụ tương đương nào) miễn là đội ngũ list có thể dễ dàng tải tệp về nguyên vẹn. Các nền tảng như YouTube không hợp lệ vì YouTube sẽ lược bỏ toàn bộ các audio track phụ. Hãy đảm bảo quyền truy cập công khai và link không hết hạn.
- **VOD (Video phát trực tiếp):** Nếu lượt hoàn thành được phát trực tiếp công khai trên YouTube hoặc Twitch (có bật tính năng phát lại khung chat), thì bản phát lại (livestream VOD) chưa qua chỉnh sửa được tính là một dạng raw footage. Dù vậy, tệp tải về trực tiếp vẫn được ưu tiên hơn.

### 7.3. Xóa Raw Footage
Khác với video công khai, bạn được phép xóa raw footage sau khi record của bạn đã được duyệt thành công.

### 7.4. Ngoại Lệ & Thời Lượng Raw Footage
- **Ngoại lệ:** Record không cần tuân theo quy tắc này nếu đã được chấp nhận trên Pointercrate (chỉ cần dán link video công khai vào ô “raw footage”). Nếu lần hoàn thành diễn ra trước ngày 22 tháng 10 năm 2024, raw footage không bắt buộc phải có track tiếng click riêng biệt nhưng vẫn phải nộp tệp raw footage.
- **Thời lượng:** Chấp nhận raw footage ở bất kỳ độ dài nào, miễn là chứa trọn vẹn lượt chơi hoàn thành và màn hình endscreen. Khuyến nghị thời lượng từ 5 đến 10 phút. Bạn được phép dừng và bật lại quay video để tiết kiệm dung lượng hoặc lược bỏ nội dung nhạy cảm.

## 8. Quy Định Về Modding & Bản Sao Chép
Record của bạn không được phép sử dụng bất kỳ bản mod nào bị cấm. Quy tắc này cũng áp dụng cho các trường hợp cheat indicator hiển thị màu đỏ/xanh lam báo lỗi gian lận, các lần hoàn thành hack lộ liễu và việc dùng bot.
Hãy nhớ rằng nếu bạn dùng mod menu như Mega Hack, tính năng Cheat Indicator on Endscreen bắt buộc phải được kích hoạt!

## 9. Lỗi Bỏ Qua Đoạn (Skips)
Trong quá trình hoàn thành, bạn không được sử dụng bất kỳ skip nào làm cho bất kỳ phần nào của màn chơi trở nên dễ hơn đáng kể. Các skip hầu như không ảnh hưởng đến độ khó hoặc làm cho màn chơi khó hơn thì được phép. Quy định này áp dụng hoàn toàn theo bộ quy tắc về skip của Pointercrate. Hãy liên hệ với ban điều hành nếu bạn chưa chắc chắn về một skip dự định dùng.

## 10. Chế Độ Hai Người Chơi (Two Player)
Trừ khi có quy định khác, tất cả các kỷ lục phải được thực hiện bởi một người chơi duy nhất (solo). Người chơi thứ hai chỉ được phép tham gia vào các đoạn kích hoạt chế độ 2 player mode của game.
- Nếu bạn hoàn thành màn chơi 2 Player theo dạng solo, bạn bắt buộc phải có webcam quay rõ cả hai tay (handcam) trong suốt toàn bộ quá trình hoàn thành. Đoạn handcam có thể hiển thị trực tiếp trên video hoặc quay riêng từ thiết bị khác kèm link tải trong ghi chú.
- **Phân loại Solo / 2P:** Chọn đúng mục phân loại trên website tương ứng với hình thức chơi của bạn.
- **Màn chơi không có mục phân loại riêng:** Vẫn cho phép beat cùng người thứ hai, nhưng chỉ người chơi điều khiển xuyên suốt toàn bộ thời lượng màn chơi mới đủ điều kiện gửi kỷ lục (trường hợp này không bắt buộc webcam).
- **Đổi lượt:** Hai người chơi không được phép hoán đổi vị trí điều khiển các đoạn solo của nhau trong cùng một lượt chơi.
- Có thể chơi từ xa thông qua Globed hoặc phần mềm kết nối máy tính từ xa như Parsec.

## 11. Quy Định Về Tài Khoản Phụ (Alt Accounts)
Nghiêm cấm hoàn toàn việc sử dụng tài khoản phụ (clone) để nộp kỷ lục trên trang web của AREDL/GDVN. Quy định này bao gồm nhưng không giới hạn ở:
- Trốn tránh lệnh cấm (ban evasion).
- Mạo danh người khác.
- Nộp kỷ lục thay cho người chơi khác.
Bạn chỉ được phép nộp các kỷ lục của chính mình bằng tài khoản Discord chính. Nếu phát hiện vi phạm, tài khoản phụ sẽ bị xóa, và tùy mức độ bạn sẽ bị cảnh cáo hoặc bị cấm tạm thời/vĩnh viễn khỏi list lẫn máy chủ Discord. Hành vi cố tình lách lệnh cấm tạm thời sẽ bị kéo dài thời gian phạt hoặc chuyển thành cấm vĩnh viễn.`;

export const DEFAULT_GUIDELINES_CHALLENGE = `# GDVN Challenge List Guideline
> *Lưu ý: Guideline này được biên soạn có tham khảo và áp dụng các quy chuẩn cốt lõi từ Challenge List Guidelines, chi tiết hơn xem tại đây.*

## A. Quy định về Màn chơi (Level Side)
- **Định nghĩa Thử thách:** Màn chơi phải có thời lượng thực tế dưới 30 giây (nhãn Short/Tiny). Cấm dùng cổng tăng tốc để gian lận thời gian hiển thị.
- Màn chơi phải có thể hoàn thành và được xác minh hợp lệ.
- Màn chơi phải được tải lên ở chế độ public không được để chế độ unlisted.
- **Hạn chế Gameplay:**
  - Cấm kỹ thuật click/thả siêu ngắn (microclicks/microreleases).
  - Cấm spam: Chuỗi từ 3 click trở lên không được có tốc độ trung bình vượt quá 10 CPS.
  - Cấm tàng hình: Không ẩn hoàn toàn icon nhân vật hoặc chướng ngại vật/hitbox. Người chơi phải nhìn thấy icon ngay trước và sau mỗi cú click bắt buộc và các vật thể liên quan đến gameplay cần phải được nhìn thấy tại một thời điểm nào đó trong khi chơi. Tuy nhiên, vẫn có thể cho phép vật thể tàng hình trong một số trường hợp, nhưng việc màn chơi đó có được chấp nhận hay không sẽ phụ thuộc hoàn toàn vào quyết định và ý kiến đánh giá từ đội ngũ Staff.
  - Cấm minigame, cấm vật phẩm lưu trạng thái (persistent items) làm thay đổi độ khó qua các lượt chơi.
  - Cấm tính ngẫu nhiên (random trigger) ảnh hưởng đến độ khó.
  - Màn chơi không được có lối đi bí mật hoặc lỗi nghiêm trọng (fatal bug).
- **Tính rõ ràng:** Player, obstacle và đường đi cần thiết phải luôn có khả năng nhận biết rõ ràng trong quá trình gameplay. Các hiệu ứng như Pulse, Flashbang, Shader, Glow, Blur, Screen Shake hoặc tương tự không được che khuất, làm mờ, biến dạng hoặc gây khó khăn đáng kể cho việc nhận biết các yếu tố gameplay. Những hiệu ứng khiến người chơi không thể hoặc rất khó xác định gameplay trong một khoảng thời gian đáng kể, đặc biệt tại các đoạn yêu cầu thao tác chính xác, có thể bị từ chối
- **Memory Challenge:** Được phép ẩn đường đi, obstacle hoặc sử dụng các đường đi đánh lừa nhằm yêu cầu người chơi ghi nhớ và nhận biết gameplay dựa trên thông tin đã được cung cấp trước đó. Các yếu tố này phải đóng vai trò là một phần có chủ đích của thử thách, thay vì chỉ được sử dụng để che giấu gameplay hoặc làm tăng độ khó một cách không cần thiết.
- **Sao chép màn chơi:** Phải có sự đồng ý rõ ràng từ tác giả gốc. Bản copy phải chơi độc lập (không dùng Start Pos) và phải có sự khác biệt lớn về gameplay so với bản gốc.
- Nếu màn chơi được chấp nhận bị xóa khỏi máy chủ GD, màn chơi đó sẽ bị gỡ khỏi danh sách
- Nếu video của màn chơi đã chấp nhận bị xóa, nó sẽ được thay thế bằng bản ghi của người chơi; nếu không có bản thay thế, màn chơi sẽ bị gỡ bỏ.
- Nếu phát hiện lỗi nghiêm trọng, Màn chơi phải được cập nhật trong vòng một tuần.
- **Giới hạn straight fly và consistency challenge:**
  - **Straight fly challenge:** Danh sách chỉ được phép có 01 straight fly challenge tại một thời điểm. Trong trường hợp có nhiều thử thách được nộp, đội ngũ staff sẽ lựa chọn thử thách có độ khó cao nhất để đưa vào danh sách.
  - **Consistency challenge:** Mỗi người chơi chỉ được phép nộp tối đa 01 consistency challenge. Việc sử dụng tài khoản phụ, tài khoản clone hoặc bất kỳ hình thức nào nhằm né tránh giới hạn này đều bị nghiêm cấm. Nếu phát hiện hành vi tạo hoặc sử dụng tài khoản clone để gửi thêm challenge, tài khoản clone sẽ bị cấm ngay lập tức và các submission liên quan có thể bị hủy.
- **Tiêu chuẩn về structure:** Thử thách không bắt buộc phải có Deco phức tạp, nhưng Layout/Structure phải được đầu tư nghiêm túc.
  - **Đạt chuẩn (Acceptable):** Các block, gai (spikes) và vật cản phải có kết cấu rõ ràng, tạo thành một khối hoặc một lối đi hoàn chỉnh.
  - **Không đạt chuẩn (Rejected):** Sử dụng object một cách bừa bãi, không có quy tắc ví dụ: Đặt một vài block đứng trơ trọi, spam gai không có mục đích rõ ràng; Structure quá sơ sài, tạo cảm giác "làm trong vòng 5 phút" để cho có.

## B. Quy định về Người chơi (Player Side)
- **Hành vi bị CẤM:** Cắt ghép video, dùng Bot/Clickbots, chơi tự động, tự ý nerf/buff màn chơi, sửa lỗi game không hợp lệ, chơi nhiều người (thử thách 2p phải do 1 người bấm), gán 1 phím cho nhiều lệnh nhập.
- **Hành vi ĐƯỢC PHÉP:** Dùng Texture packs (không hiện hitbox), đổi nút bấm (Rebinds) / Nhảy bằng mọi phím (Every Key Jump). Sử dụng noclip nếu độ chính xác (accuracy) là 100%.
- Danh sách phần lớn các tính năng của Megahack cũng như một số bản hack bên ngoài được cho phép hay không có thể được tìm thấy tại https://docs.google.com/spreadsheets/u/0/d/1sDqiF59bbH4-og908IHfT9BVafQkW-x8aNNs1s_e9K4/edit . (NOTE: ngoài show hitbox on death không bị cấm tại danh sách này thì tất cả các tính năng còn lại tuân theo spreadsheet trên)
- **Yêu cầu đối với video records:**
  - Đối với thử thách từ hạng 50 trở lên phải gửi video gốc chưa qua chỉnh sửa (tải lên Google Drive hoặc Youtube).
  - Phải có âm thanh tiếng click chuột/bấm phím rõ ràng.
  - Phải hiển thị bộ đếm FPS (trừ iOS).
  - Nếu quay bằng camera ngoài, video phải đạt tối thiểu 30fps và quay rõ màn hình game chiếm ít nhất 50% khung hình.
  - Chỉ chấp nhận hoàn thành 100% màn chơi.
  - Nếu sử dụng video tổng hợp để nộp, bạn phải chỉ rõ dấu thời gian (timestamp) cho từng bản nộp.
  - Video phải có chất lượng đủ tốt. Khuyến nghị 360p trở lên.
  - Video phải có chế độ truy cập ít nhất là "Unlisted" (không công khai). Video đăng trong nhóm Facebook GDVN được chấp nhận.`;

export const DEFAULT_GUIDELINES_PLATFORMER = `# GDVN Platformer List Guideline
> Quy định được chuyển tiếp từ bộ quy tắc của Pemonlist.
> Quy định vẫn đang được chỉnh sửa và phát triển!

## 1. Hướng Dẫn Chung
- Đảm bảo chọn đúng ID màn chơi hoặc đúng màn chơi trên menu pop-up (đặc biệt lưu ý với các màn chơi trùng tên hoặc có tên tương tự nhau).
- Mục "Link Video" là nơi điền liên kết video bạn muốn hiển thị công khai trên trang web.
- Mục "Raw Footage" dành cho video quay lại toàn bộ quá trình chơi chưa qua cắt ghép; lưu ý rằng mục này chỉ bắt buộc đối với các lượt hoàn thành Extreme Demon. Nếu bạn nộp record cho màn chơi không phải Extreme Demon và không có raw footage, vui lòng để trống ô này.
- Nếu sau khi nộp bạn nhận ra mình đã nhập sai thông tin, hãy liên hệ với mod để được hỗ trợ sửa đổi.

## 2. Quy Định Về Raw Footage
*(Lưu ý: Raw footage chỉ bắt buộc đối với Extreme Demon, còn các màn dưới Extreme có thể nộp tùy ý. Các quy định dưới đây chỉ áp dụng cho Extreme Demon)*
- Bạn phải cung cấp một bản ghi lại toàn bộ lượt chơi hoàn thành, bao gồm việc hoàn thành từng checkpoint và hiển thị màn hình kết thúc (endscreen).
- Một bản ghi đầy đủ xuyên suốt là lý tưởng nhất, nhưng tối thiểu phải có 5 phút cho mỗi checkpoint (hoặc toàn bộ bản ghi bắt đầu từ các lượt thử tại checkpoint đó).
- Đoạn phim bắt buộc phải có âm thanh thu từ micro với tiếng click nghe rõ ràng.

## 3. Tiêu Chuẩn Chất Lượng Video
Dưới đây là các lý do khiến một record không thể xác minh do chất lượng video không đạt yêu cầu:
- Độ phân giải quá thấp (Extremely Low Resolution).
- Khung hình bị giật lag/tụt FPS nghiêm trọng (Severe Framerate Drops).
- Màn hình gameplay bị che khuất (Covered Gameplay).
- Không nghe thấy tiếng click (đối với Extreme Demon).

**Lưu ý bổ sung về âm thanh và hiển thị:**
- Nếu không chắc video của mình có đạt chuẩn hay không, bạn hãy liên hệ với thành viên đội ngũ mod hoặc hỏi tại kênh hỗ trợ trên máy chủ Discord.
- Nếu bạn gặp khó khăn khi thu âm tiếng click, chúng tôi khuyên bạn nên dùng điện thoại hoặc thiết bị tương tự để ghi âm khi chơi. Đối với người chơi trên điện thoại (mobile) hoặc tay cầm (controller), ban quản trị sẽ không quá khắt khe về độ rõ của tiếng click.
- Dù tính năng hiển thị phím bấm (input overlay) KHÔNG thể thay thế cho tiếng click, việc sử dụng nó có thể hỗ trợ xác minh tính hợp lệ cho record của bạn (ví dụ: trường hợp click quá nhỏ), tuy nhiên điều này không bắt buộc.
- Việc sử dụng "Click Sounds" hoặc "Click Bot" để thay thế cho tiếng click thật bị nghiêm cấm hoàn toàn và sẽ khiến record của bạn bị coi là không hợp lệ.

## 4. Quy Định Về Sử Dụng Bản Mod
- Việc sử dụng các bản hack, exploit và chương trình bên ngoài can thiệp vào vật lý game, thay đổi input, chỉnh sửa hitbox, hiển thị các thông tin ẩn, can thiệp tốc độ game hoặc thay đổi cơ chế gameplay cốt lõi đều bị cấm (trừ một số ngoại lệ).
- Vui lòng tham khảo danh sách các mod, hack và phần mềm được cho phép qua tài liệu liên kết.
- Nếu một bản hack, mod hoặc phần mềm không được nhắc đến trong bảng danh sách, mặc định coi như bản đó không được phép sử dụng.
- Nếu bạn không chắc chắn về tính hợp lệ của một bản mod, hãy liên hệ với thành viên ban kiểm duyệt record.

## 5. Hành Vi Tạm Dừng Liên Tục (Pause Buffering)
- Pause buffering là một hành vi lợi dụng cơ chế bằng cách liên tục bấm tạm dừng (pause) và tiếp tục (unpause) thật nhanh nhằm mục đích làm chậm tốc độ game để xử lý tình huống.
- Các record sử dụng mẹo này sẽ không được chấp nhận.
- Việc tạm dừng game một cách bình thường sẽ không bị coi là pause buffering. Hành vi này chỉ bị cấm khi người chơi cố ý lạm dụng để trục lợi; bạn vẫn hoàn toàn được phép tạm dừng ở những đoạn có khoảng nghỉ thời gian để suy nghĩ trong quá trình chơi.

## 6. Các Quy Định Khác
- Lượt hoàn thành phải do chính bạn (chủ sở hữu duy nhất của tài khoản) thực hiện. Việc nhờ người khác chơi hộ một màn hoặc một phần màn chơi sẽ khiến record bị hủy bỏ.
- Các màn chơi 2 người (Two-player) hoặc các màn sử dụng cơ chế hai người chơi bắt buộc phải được chơi solo (tự chơi một mình).
- Bắt buộc phải có handcam đối với tất cả các màn Extreme Demon chế độ 2 người mà người chơi phải điều khiển độc lập từ hai nhân vật trở lên cùng một lúc.
- Việc đính kèm một bản cắt ngắn gọn của video sẽ giúp đội ngũ kiểm duyệt dễ dàng và nhanh chóng xem xét record của bạn hơn.
- Video bạn nộp sẽ được hiển thị công khai cùng với record của bạn. Nó phải chứa cảnh quay lần hoàn thành khớp chính xác với bản raw footage.
- Bạn phải dùng thống nhất một tên tài khoản cho tất cả các record nộp lên. Cố tình chia nhỏ để nộp qua nhiều tài khoản sẽ khiến toàn bộ record của bạn bị xóa bỏ.
- Các quy định này áp dụng công bằng như nhau trên mọi thiết bị (Điện thoại, PC,...).
- Nếu video hiển thị trên trang web chứa bất kỳ nội dung 18+ / nhạy cảm (NSFW) nào, record của bạn có thể bị từ chối do chúng tôi không liên kết nội dung nhạy cảm lên website.
- Những lần hoàn thành lạm dụng các lỗi bỏ qua đoạn lớn (large skips) hoặc đường đi tắt ẩn (secret ways) có thể làm record mất hiệu lực (những skip nhỏ không ảnh hưởng đáng kể vẫn được chấp nhận). Nếu bạn phân vân liệu một skip có được phép dùng hay không, hãy liên hệ với thành viên ban quản trị.`;

export function getGuidelineDbKey(tab: string): string {
  switch (tab) {
    case 'classic':
      return 'guidelines-classic';
    case 'challenge':
      return 'guidelines-challenge';
    case 'platformer':
      return 'guidelines-platformer';
    case 'main':
    default:
      return 'guidelines-main';
  }
}

export function getDefaultGuidelineContent(tab: string): string {
  switch (tab) {
    case 'classic':
      return DEFAULT_GUIDELINES_CLASSIC;
    case 'challenge':
      return DEFAULT_GUIDELINES_CHALLENGE;
    case 'platformer':
      return DEFAULT_GUIDELINES_PLATFORMER;
    case 'main':
    default:
      return DEFAULT_GUIDELINES_MAIN;
  }
}
