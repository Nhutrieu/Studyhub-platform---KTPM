<?php
// D:\Xampp\htdocs\HeThongChamSocCaKoi\backend\api\shop\products\convert_worker.php

// Lưu ý: Script này chạy dưới dạng CLI (Command Line Interface) ngầm
// Nó không có session hay $_POST, chỉ nhận tham số qua $argv

require_once '../../../../includes/db.php';

// Cấu hình đường dẫn FFmpeg (giống bên add.php)
define('FFMPEG_PATH', 'ffmpeg'); // Hoặc đường dẫn tuyệt đối C:\\ffmpeg\\bin\\ffmpeg.exe

// Kiểm tra tham số đầu vào
if ($argc < 3) {
    die("Thiếu tham số: php convert_worker.php <file_path> <product_image_id>");
}

$sourcePath     = $argv[1]; // Đường dẫn file gốc (VD: .../media_123.wmv)
$productImageId = (int)$argv[2]; // ID trong bảng ProductImage

if (!file_exists($sourcePath)) {
    die("File nguồn không tồn tại: $sourcePath");
}

// Chuẩn bị đường dẫn đích (.mp4)
$pathInfo = pathinfo($sourcePath);
$newFileName = $pathInfo['filename'] . '.mp4';
$destPath = $pathInfo['dirname'] . '/' . $newFileName;

// Câu lệnh convert FFmpeg
// -y: Overwrite output files
// -v error: Chỉ hiện lỗi (giảm log)
$cmd = sprintf(
    '%s -i "%s" -c:v libx264 -c:a aac -strict experimental -y "%s" 2>&1',
    FFMPEG_PATH,
    $sourcePath,
    $destPath
);

// Ghi log bắt đầu (Optional: tạo file log riêng nếu muốn debug)
// file_put_contents('convert_log.txt', date('Y-m-d H:i:s') . " Start converting ID: $productImageId\n", FILE_APPEND);

exec($cmd, $output, $returnCode);

if ($returnCode === 0 && file_exists($destPath)) {
    // 1. Convert thành công -> Update Database
    // Đường dẫn lưu trong DB (Relative path cho web)
    // Giả sử $sourcePath dạng: D:/.../uploads/products/media_...
    // Ta cần lấy phần từ /uploads trở đi.
    
    // Cách đơn giản nhất để lấy URL web từ đường dẫn file trong cấu trúc hiện tại:
    $webUrl = '/HeThongChamSocCaKoi/uploads/products/' . $newFileName;

    $stmt = $conn->prepare("UPDATE ProductImage SET ImageURL = ?, MediaType = 'video' WHERE ProductImageID = ?");
    $stmt->bind_param("si", $webUrl, $productImageId);
    $stmt->execute();
    $stmt->close();

    // 2. Xóa file gốc (.wmv, .avi...)
    @unlink($sourcePath);

    // file_put_contents('convert_log.txt', date('Y-m-d H:i:s') . " Success: $webUrl\n", FILE_APPEND);
} else {
    // file_put_contents('convert_log.txt', date('Y-m-d H:i:s') . " Failed: " . implode(" ", $output) . "\n", FILE_APPEND);
}

$conn->close();
?>