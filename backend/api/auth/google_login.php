<?php
require __DIR__ . '/../../../vendor/autoload.php';

$config = require 'google_config.php';

$client = new Google_Client();
$client->setClientId($config['client_id']);
$client->setClientSecret($config['client_secret']);
$client->setRedirectUri($config['redirect_uri']);
$client->addScope("email");
$client->addScope("profile");

$auth_url = $client->createAuthUrl();

header("Location: $auth_url");
exit;
