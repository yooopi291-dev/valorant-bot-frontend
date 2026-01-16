require('dotenv').config();
const mongoose = require('mongoose');

mongoose.connect(process.env.MONGO_URI)
  .then(() => {
    console.log('Успешно подключено к MongoDB');
    process.exit(0);
  })
  .catch(err => {
    console.error('Ошибка:', err.message);
    process.exit(1);
  });