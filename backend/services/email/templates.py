def layout(title: str, body: str) -> str:
    return f"""
<table width="100%" cellpadding="0" cellspacing="0" style="background:#F4F7F9;padding:32px 0;font-family:Georgia,'Times New Roman',serif;">
  <tr><td align="center">
    <table width="560" cellpadding="0" cellspacing="0" style="background:#FFFFFF;border:1px solid #E3E8EC;">
      <tr><td style="background:#002147;padding:24px 32px;color:#FFFFFF;">
        <div style="font-size:22px;letter-spacing:0.5px;">Madam Boutique</div>
        <div style="font-size:11px;letter-spacing:3px;text-transform:uppercase;color:#B0C4DE;">Tailored for You</div>
      </td></tr>
      <tr><td style="padding:32px;color:#0A1128;font-size:15px;line-height:1.6;">
        <h2 style="margin:0 0 16px;font-size:22px;color:#002147;font-weight:normal;">{title}</h2>
        {body}
      </td></tr>
      <tr><td style="padding:16px 32px;border-top:1px solid #E3E8EC;font-size:12px;color:#7A8C99;font-family:Arial,sans-serif;">
        Crafted with Care | Designed for You<br/>Madam Boutique &amp; Madam Fashions
      </td></tr>
    </table>
  </td></tr>
</table>"""


def button(link: str, label: str) -> str:
    return (f'<p style="margin:24px 0;"><a href="{link}" style="background:#002147;color:#FFFFFF;text-decoration:none;'
            f'padding:12px 28px;display:inline-block;font-family:Arial,sans-serif;font-size:14px;letter-spacing:0.5px;">{label}</a></p>'
            f'<p style="font-size:12px;color:#7A8C99;font-family:Arial,sans-serif;">If the button does not work, copy this link:<br/>{link}</p>')


def verification_email(link: str) -> str:
    return layout("Verify your email address",
                  "<p>Namaste,</p><p>Thank you for choosing Madam Boutique &amp; Madam Fashions. "
                  "Please confirm your email address to continue creating your account.</p>"
                  + button(link, "Verify Email & Continue")
                  + "<p style='font-size:13px;color:#4A6572;'>This link is valid for 24 hours. If you did not request this, you can ignore this email.</p>")


def password_reset_email(link: str) -> str:
    return layout("Reset your password",
                  "<p>We received a request to reset the password for your Madam Boutique account.</p>"
                  + button(link, "Reset Password")
                  + "<p style='font-size:13px;color:#4A6572;'>This link is valid for 1 hour. If you did not request a reset, no action is needed.</p>")


def welcome_email(name: str, customer_no: str) -> str:
    return layout(f"Welcome, {name}",
                  f"<p>Your account has been created successfully. Your customer number is <strong>{customer_no}</strong>.</p>"
                  "<p>You can now explore Madam Boutique for custom tailoring and Madam Fashions for premium dress materials.</p>"
                  "<p>Warm regards,<br/>Team Madam Boutique</p>")


def new_customer_notification(name: str, email: str, mobile: str, customer_no: str) -> str:
    return layout("New Customer Registration",
                  "<p>A new customer has successfully registered with Madam Fashions.</p>"
                  f"<p>Customer Name: <strong>{name}</strong><br/>Email: {email}<br/>Mobile: {mobile}<br/>Customer No: <strong>{customer_no}</strong></p>"
                  "<p>You may wish to contact the customer personally to welcome them.</p>"
                  "<p>Regards,<br/>Madam Fashions Website</p>")
