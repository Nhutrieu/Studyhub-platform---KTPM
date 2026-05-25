<?php
include('../../../config/db.php');

$data = json_decode(file_get_contents("php://input"), true);

$sql = "INSERT INTO News (Title, Content, Author, Category) VALUES (?, ?, ?, ?)";
$stmt = $conn->prepare($sql);
$stmt->bind_param("ssss", $data['Title'], $data['Content'], $data['Author'], $data['Category']);

echo json_encode(["success" => $stmt->execute()]);
?>
