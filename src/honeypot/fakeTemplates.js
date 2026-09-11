export function getWordPressLoginPage(errorMessage = '') {
    const errorBlock = errorMessage
        ? `<div style="border-left:4px solid #d63638; background:#fff; padding:12px; margin-bottom:20px; box-shadow:0 1px 1px rgba(0,0,0,.04);"><p style="margin:0; font-family:sans-serif; font-size:13px;">${errorMessage}</p></div>`
        : '';

    return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <title>Log In &lsaquo; Corporate Blog &mdash; WordPress</title>
    <style>
        body { background: #f0f0f1; font-family: -apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,Oxygen-Sans,Ubuntu,Cantarell,"Helvetica Neue",sans-serif; display:flex; justify-content:center; align-items:center; height:100vh; margin:0; }
        .login-box { width: 320px; padding: 24px; background: #fff; border: 1px solid #c3c4c7; box-shadow: 0 1px 3px rgba(0,0,0,.04); }
        .input { width: 100%; padding: 8px; margin: 8px 0 16px 0; border: 1px solid #8c8f94; box-sizing:border-box; border-radius:4px; }
        .btn { background: #2271b1; color: #fff; border: none; padding: 8px 16px; border-radius: 3px; cursor: pointer; font-weight:600; }
        label { font-size: 14px; color: #3c434a; }
    </style>
</head>
<body>
    <div>
        ${errorBlock}
        <div class="login-box">
            <form method="POST" action="/wp-login.php">
                <label>Username or Email Address</label>
                <input type="text" name="log" class="input" required autofocus>
                <label>Password</label>
                <input type="password" name="pwd" class="input" required>
                <input type="submit" value="Log In" class="btn">
            </form>
        </div>
    </div>
</body>
</html>`;
}

// src/honeypot/fakeTemplates.js

export function getApacheDefaultPage() {
    return `<!DOCTYPE html PUBLIC "-//W3C//DTD XHTML 1.0 Transitional//EN" "http://www.w3.org/TR/xhtml1/DTD/xhtml1-transitional.dtd">
<html xmlns="http://www.w3.org/1999/xhtml">
  <head>
    <meta http-equiv="Content-Type" content="text/html; charset=UTF-8" />
    <title>Apache2 Ubuntu Default Page: It works</title>
    <style type="text/css" media="screen">
      * {
        margin: 0px 0px 0px 0px;
        padding: 0px 0px 0px 0px;
      }

      body, html {
        padding: 3px 3px 3px 3px;
        background-color: #D8DBE2;
        font-family: Verdana, sans-serif;
        font-size: 11pt;
        text-align: center;
      }

      div.main_page {
        position: relative;
        display: table;
        width: 800px;
        margin-bottom: 3px;
        margin-left: auto;
        margin-right: auto;
        padding: 0px 0px 0px 0px;
        border-width: 2px;
        border-color: #212738;
        border-style: solid;
        background-color: #FFFFFF;
        text-align: left;
      }

      div.page_header {
        height: 99px;
        width: 100%;
        background-color: #F5F6F8;
      }

      div.page_header span.dish {
        height: 86px;
        width: 180px;
        float: right;
        font-family: sans-serif;
        font-weight: bold;
        font-size: 20pt;
        color: #df0000;
        text-align: right;
        padding: 10px 10px 0px 0px;
      }

      div.page_header span.floating_element {
        display: inline-block;
        padding: 10px 0px 0px 15px;
        color: #444;
        font-size: 16pt;
        font-weight: bold;
      }

      div.table_of_contents {
        clear: left;
        min-width: 200px;
        margin: 3px 3px 3px 3px;
        background-color: #FFFFFF;
        text-align: left;
      }

      div.table_of_contents_item {
        clear: left;
        width: 100%;
        margin: 4px 0px 0px 0px;
        background-color: #FFFFFF;
        color: #000000;
        text-align: left;
      }

      div.table_of_contents_item a {
        margin-left: 8px;
        font-size: 12pt;
        text-decoration: none;
      }

      div.content_section {
        margin-top: 20px;
        margin-bottom: 14px;
        padding: 5px 20px 5px 20px;
        border-top: 1px solid #D8DBE2;
      }

      div.content_section_text {
        padding: 4px 8px 4px 8px;
        color: #000000;
        font-size: 10pt;
        text-shadow: 0px 0px 1px #999;
      }

      div.content_section_text pre {
        margin: 8px 0px 8px 0px;
        padding: 4px;
        border: 1px solid #C0C0C0;
        background-color: #FAFAFA;
        font-family: monospace;
        font-size: 9pt;
        overflow: auto;
      }

      div.validator {
        padding: 10px;
        text-align: right;
        font-size: 9pt;
      }
    </style>
  </head>
  <body>
    <div class="main_page">
      <div class="page_header floating_element">
        <span class="dish">It works!</span>
        <span class="floating_element">
          Apache2 Ubuntu Default Page
        </span>
      </div>

      <div class="content_section floating_element">
        <div class="content_section_text">
          <p>
            This is the default welcome page used to test the correct 
            operation of the Apache2 server after installation on Ubuntu systems.
            It is based on the equivalent page on Debian, from which the Ubuntu Apache
            packaging is derived.
            If you can read this page, it means that the Apache HTTP server installed at
            this site is working properly. You should <b>replace this file</b> (located at
            <tt>/var/www/html/index.html</tt>) before continuing to operate your HTTP server.
          </p>
          <p>
            If you are a normal user of this web site and don't know what this page is
            about, this probably means that the site is currently unavailable due to
            maintenance.
            If the problem persists, please contact the site's administrator.
          </p>
        </div>
      </div>

      <div class="content_section floating_element">
        <div class="content_section_text">
          <p>
            The Ubuntu configuration of the Apache web server differs from the
            upstream default configuration, and is split into several files optimized for
            interaction with Ubuntu tools. The configuration system is
            <b>fully documented in
            /usr/share/doc/apache2/README.Debian.gz</b>. Refer to this if you need more info.
          </p>
          <pre>
/etc/apache2/
|-- apache2.conf
|	|--  ports.conf
|-- mods-enabled
|	|-- *.load
|	|-- *.conf
|-- conf-enabled
|	|-- *.conf
|-- sites-enabled
|	|-- *.conf
          </pre>
        </div>
      </div>

      <div class="validator">
        <p>
          <small>Ubuntu is a registered trademark of Canonical Ltd.</small>
        </p>
      </div>
    </div>
  </body>
</html>`;
}