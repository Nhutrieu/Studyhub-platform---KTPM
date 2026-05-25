<?php
error_reporting(0);
require_once '../../../includes/db.php';
session_start();

if (!isset($_SESSION['username'])) exit;

$username = $_SESSION['username'];
$conn->query("UPDATE Users SET LastSeen = NOW() WHERE Username = '" . $conn->real_escape_string($username) . "'");
?>
