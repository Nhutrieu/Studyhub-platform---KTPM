<?php
require __DIR__ . '/../../../vendor/autoload.php';
session_start();

$config = require __DIR__ . '/facebook_config.php';

$fb = new \Facebook\Facebook([
    'app_id'                => $config['app_id'],
    'app_secret'            => $config['app_secret'],
    'default_graph_version' => $config['graph_version'],
]);

$helper = $fb->getRedirectLoginHelper();

// Quyền muốn xin – email là quan trọng
$permissions = ['email']; // public_profile có sẵn

$loginUrl = $helper->getLoginUrl($config['redirect_uri'], $permissions);

// Chuyển trình duyệt sang trang login của Facebook
header('Location: ' . $loginUrl);
exit;
