<?php
$host = "localhost";
$user = "root";
$pass = "";
$dbname = "koi_care_system";

$conn = new mysqli($host, $user, $pass, $dbname);
date_default_timezone_set('Asia/Ho_Chi_Minh');
if ($conn->connect_error) {
    die("Connection failed: " . $conn->connect_error);
}
?>
