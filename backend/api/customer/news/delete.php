<?php
include('../../../config/db.php');
$data = json_decode(file_get_contents('php://input'), true);
$id = intval($data['NewsID'] ?? 0);
$stmt = $conn->prepare("DELETE FROM News WHERE NewsID=?");
$stmt->bind_param('i', $id);
echo json_encode(["success"=>$stmt->execute(), "err"=>$stmt->error]);