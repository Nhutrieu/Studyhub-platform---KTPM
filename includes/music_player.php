<!DOCTYPE html>
<html lang="vi">
<head>
<meta charset="UTF-8">
</head>
<body style="margin:0">
<audio id="bg-music" autoplay loop>
  <source src="/HeThongChamSocCaKoi/assets/music/koi_theme.mp3" type="audio/mpeg">
</audio>
<script>
  const music = document.getElementById('bg-music');
  music.volume = 0.2;

  // 💾 Ghi nhớ thời gian phát nhạc
  window.addEventListener('beforeunload', () => {
      localStorage.setItem('musicTime', music.currentTime);
  });

  // 🔁 Khôi phục lại thời gian & trạng thái
  window.addEventListener('DOMContentLoaded', () => {
      const enabled = localStorage.getItem('musicEnabled') === 'true';
      const savedTime = parseFloat(localStorage.getItem('musicTime') || 0);
      music.currentTime = savedTime;
      if (enabled) music.play().catch(()=>{});
      else music.pause();
  });

  // Lắng nghe bật/tắt nhạc từ trang chính
  window.addEventListener('message', (e) => {
      if (e.data === 'playMusic') {
          music.play().catch(()=>{});
          localStorage.setItem('musicEnabled', 'true');
      } else if (e.data === 'pauseMusic') {
          music.pause();
          localStorage.setItem('musicEnabled', 'false');
      }
  });
</script>
</body>
</html>
