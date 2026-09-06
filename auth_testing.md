# Auth Testing Playbook (Madam Boutique Module 1)

## Sessions
Both Google and email logins create a document in `user_sessions` {user_id, session_token, expires_at} and set the httpOnly cookie `session_token`. Backend also accepts `Authorization: Bearer <session_token>`.

## Create a test session manually (simulates Google login)
mongosh --eval "
use('test_database');
var userId = 'test-user-' + Date.now();
var sessionToken = 'test_session_' + Date.now();
db.users.insertOne({ user_id: userId, customer_no: 'CUST-TEST', email: 'test.user.' + Date.now() + '@example.com', name: 'Test User', auth_provider: 'google', email_verified: true, picture: null, created_at: new Date() });
db.user_sessions.insertOne({ user_id: userId, session_token: sessionToken, expires_at: new Date(Date.now() + 7*24*60*60*1000), created_at: new Date() });
print('Session token: ' + sessionToken);
"

## API checks
curl -c cookies.txt -X POST $API/api/auth/login -H "Content-Type: application/json" -d '{"email":"test.customer@madamboutique.in","password":"Madam@1234"}'
curl -b cookies.txt $API/api/auth/me
curl -X GET $API/api/auth/me -H "Authorization: Bearer <SESSION_TOKEN>"

## Browser
await page.context.add_cookies([{ "name": "session_token", "value": "<SESSION_TOKEN>", "domain": "<app-host>", "path": "/", "httpOnly": true, "secure": true, "sameSite": "None" }]);

## Email flows without inbox access
EXPOSE_DEV_LINKS=true → `POST /api/auth/verify-email/request` and `POST /api/auth/forgot-password` return `dev_link`.

## Cleanup
mongosh --eval "use('test_database'); db.users.deleteMany({email: /test\.user\./}); db.user_sessions.deleteMany({session_token: /test_session/});"
