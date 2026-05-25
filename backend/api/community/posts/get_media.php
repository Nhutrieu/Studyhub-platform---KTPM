<?php
header("Content-Type: application/json; charset=utf-8");
require_once "../../../../includes/db.php";

if (!isset($_GET["post_id"])) {
    echo json_encode([
        "success" => false,
        "media" => [],
        "error" => "Missing post_id"
    ], JSON_UNESCAPED_UNICODE);
    exit;
}

$postId = (int)$_GET["post_id"];

$sql = "SELECT MediaID, MediaType, FilePath 
        FROM CommunityPostMedia 
        WHERE PostID = ?
        ORDER BY MediaID ASC";

$stmt = $conn->prepare($sql);
$stmt->bind_param("i", $postId);
$stmt->execute();
$res = $stmt->get_result();

$media = [];

while ($m = $res->fetch_assoc()) {

    // Chuẩn hóa URL
    if (!str_starts_with($m["FilePath"], "/")) {
        $m["FilePath"] = "/HeThongChamSocCaKoi" . $m["FilePath"];
    }

    $media[] = $m;
}

echo json_encode([
    "success" => true,
    "media" => $media
], JSON_UNESCAPED_UNICODE);
