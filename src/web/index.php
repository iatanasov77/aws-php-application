<?php
ini_set( 'display_errors', '1' );
ini_set( 'display_startup_errors', '1' );
error_reporting( E_ALL );

require 'vendor/autoload.php';

use Aws\S3\S3Client;
use Aws\DynamoDb\DynamoDbClient;

if ( isset( $_POST['submit'] ) ) {
    echo "FORM IS SUBMITED !!!";
}

?>

<html lang="en">
    <head>
        <title>Upload Files</title>
        
        <meta http-equiv="Content-Type" content="text/html; charset=utf-8" />
    </head>
    <body>
        <form name="profile_form" method="post" enctype="multipart/form-data">
            <label for="aws-file-upload">Upload File</label>
            <input type="file" id="aws-file-upload" name="aws-file-upload" />
            <input type="submit" id="submit" name="submit" value="Upload a File" />
        </form>
    </body>
</html>
