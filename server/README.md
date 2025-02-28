# Server README

Try registering a new user::
```bash
 curl -X POST http://localhost:3000/api/auth/register \
∙ -H "Content-Type: application/json" \
∙ -d '{"email":"test@example.com","password":"password123","name":"Test User"}'
<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<title>Error</title>
</head>
<body>
<pre>Cannot POST /api/auth/register</pre>
</body>
</html>
```

Try logging in with the user you just registered:
```bash
curl -X POST http://localhost:3000/api/auth/login \
-H "Content-Type: application/json" \
-d '{"email":"test@example.com","password":"password123"}'
```

# MongoDB shell basic commands
```
// Show all databases
show dbs

// Create/switch to a database
use myDatabase

// Create a collection and insert a document
db.myCollection.insertOne({ name: "John", age: 30 })

// Find documents
db.myCollection.find()

// Find specific documents
db.myCollection.find({ name: "John" })

// Update a document
db.myCollection.updateOne({ name: "John" }, { $set: { age: 31 } })

// Delete a document
db.myCollection.deleteOne({ name: "John" })
```