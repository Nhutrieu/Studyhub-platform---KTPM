<?php
include('../../includes/db.php');

$data = json_decode(file_get_contents("php://input"), true);
$UserID = $data['UserID'];

$stmt = $conn->prepare("DELETE FROM Users WHERE UserID=?");
$stmt->bind_param("i", $UserID);

echo json_encode(["success" => $stmt->execute()]);
?>
