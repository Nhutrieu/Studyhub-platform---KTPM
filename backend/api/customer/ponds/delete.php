<?php
require_once '../../../../includes/db.php';
session_start();

if (!isset($_SESSION['username'])) {
    header("Location: /HeThongChamSocCaKoi/frontend/auth/login.php");
    exit;
}

$PondID = (int)$_GET['id'];

$sql = "SELECT COUNT(*) AS cnt FROM KoiFish WHERE PondID = ?";
$stmt = $conn->prepare($sql);
$stmt->bind_param("i", $PondID);
$stmt->execute();
$result = $stmt->get_result()->fetch_assoc();

if ($result['cnt'] > 0) {
    echo "<script>
        alert('Không thể xóa vì hồ vẫn còn cá Koi!');
        window.location.href='/HeThongChamSocCaKoi/frontend/customer/ponds.php';
    </script>";
    exit;
}

$conn->query("DELETE FROM Pond WHERE PondID = $PondID");
header("Location: /HeThongChamSocCaKoi/frontend/customer/ponds.php");
exit;
