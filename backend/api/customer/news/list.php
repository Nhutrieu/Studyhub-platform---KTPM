<?php
include('../../../config/db.php');
$res = $conn->query("SELECT * FROM News ORDER BY PublishedDate DESC");
$out = [];
while ($r = $res->fetch_assoc()) $out[] = $r;
echo json_encode($out);