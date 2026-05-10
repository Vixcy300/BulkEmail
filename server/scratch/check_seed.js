const mongoose = require('mongoose');
const dotenv = require('dotenv');
const bcrypt = require('bcryptjs');
const path = require('path');

dotenv.config({ path: path.join(__dirname, '..', '.env') });

const AdminSchema = new mongoose.Schema({
  username: { type: String, required: true, unique: true },
  passwordHash: { type: String, required: true },
});
const Admin = mongoose.model('Admin', AdminSchema);

async function check() {
  await mongoose.connect(process.env.MONGO_URI);
  const users = await Admin.find({});
  console.log('Current Users:', users.map(u => u.username));
  
  const existing = await Admin.findOne({ username: process.env.ADMIN_USERNAME });
  if (!existing) {
    const hash = await bcrypt.hash(process.env.ADMIN_PASSWORD, 10);
    await Admin.create({ username: process.env.ADMIN_USERNAME, passwordHash: hash });
    console.log(`✅ Forced Seed → username: ${process.env.ADMIN_USERNAME}`);
  } else {
    console.log('User already exists. Updating password just in case.');
    existing.passwordHash = await bcrypt.hash(process.env.ADMIN_PASSWORD, 10);
    await existing.save();
  }
  process.exit(0);
}

check();
