<?php
header("Content-Type: application/json; charset=utf-8");
session_start();
require_once "../../../../includes/db.php";

function fail($m) {
    echo json_encode(["success"=>false, "error"=>$m], JSON_UNESCAPED_UNICODE);
    exit;
}

if (!isset($_SESSION["username"])) fail("Chưa đăng nhập.");

$postId = isset($_POST["post_id"]) ? intval($_POST["post_id"]) : 0;
$privacy = $_POST["privacy"] ?? "public";

if (!$postId) fail("Thiếu ID bài viết.");

$u = $_SESSION["username"];
$st = $conn->prepare("SELECT UserID FROM Users WHERE Username=?");
$st->bind_param("s", $u);
$st->execute();
$user = $st->get_result()->fetch_assoc();
if (!$user) fail("Không tìm thấy tài khoản.");

$uid = intval($user["UserID"]);

$st = $conn->prepare("SELECT UserID FROM CommunityPost WHERE PostID=?");
$st->bind_param("i", $postId);
$st->execute();
$p = $st->get_result()->fetch_assoc();
if (!$p) fail("Bài viết không tồn tại.");

if (intval($p["UserID"]) !== $uid) fail("Bạn không sở hữu bài viết này.");

$st = $conn->prepare("UPDATE CommunityPost SET Privacy=?, UpdatedAt=NOW() WHERE PostID=?");
$st->bind_param("si", $privacy, $postId);
$st->execute();

echo json_encode(["success"=>true], JSON_UNESCAPED_UNICODE);
