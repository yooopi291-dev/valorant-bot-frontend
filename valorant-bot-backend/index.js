require('dotenv').config();

// Устанавливаем часовой пояс
process.env.TZ = 'Europe/Moscow';

// Глобальные обработчики ошибок
process.on('uncaughtException', (error) => {
  console.error('🔥 Необработанное исключение:', error);
  // Не завершаем процесс, продолжаем работу
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('🔥 Необработанный промис:', reason);
});

const express = require('express');
const TelegramBot = require('node-telegram-bot-api');
const mongoose = require('mongoose');

// ========== КОНСТАНТЫ ==========
const ADMIN_IDS = [1042528261]; // Ваш Telegram ID
const ORDER_CLEANUP_INTERVAL = 15 * 60 * 1000; // 15 минут для отмены неоплаченных заказов
const DOLLAR_EXCHANGE_RATE = 95; // Курс доллара к рублю (измените при необходимости)
const RUB_SYMBOL = '₽';
const ACCOUNTS_PER_PAGE = 5; // Аккаунтов на странице в админ-панели

console.log('=== Valorant Bot Starting ===');

const app = express();
app.use(express.json());

// Проверка токена
if (!process.env.TELEGRAM_TOKEN) {
  console.error('❌ TELEGRAM_TOKEN не найден');
  process.exit(1);
}

// MongoDB подключение
if (process.env.MONGO_URI) {
  mongoose.connect(process.env.MONGO_URI, {
    serverSelectionTimeoutMS: 5000,
    family: 4
  })
  .then(() => console.log('✅ MongoDB подключен'))
  .catch(err => {
    console.error('❌ MongoDB не подключен:', err.message);
    console.log('❌ Бот не может работать без базы данных');
    process.exit(1);
  });
} else {
  console.error('❌ MONGO_URI не указан');
  process.exit(1);
}

// ========== СХЕМЫ БАЗЫ ДАННЫХ ==========
const UserSchema = new mongoose.Schema({
  user_id: { type: Number, unique: true, required: true },
  username: String,
  first_name: String,
  role: { type: String, default: 'client' },
  created_at: { type: Date, default: Date.now },
  has_seen_welcome: { type: Boolean, default: false }
});

const AccountSchema = new mongoose.Schema({
  title: { type: String, required: true },
  description: String,
  rank: { type: String, required: true },
  price_usd: { type: Number, required: true },
  price_rub: { type: Number, required: true },
  skins: [{ type: String }],
  agents: [{ type: String }],
  level: Number,
  region: { 
    type: String, 
    enum: ['CIS', 'EU', 'NA', 'APAC', 'BR', 'LATAM'],
    default: 'EU' 
  },
  login: { type: String, required: true },
  password: { type: String, required: true },
  email: String,
  email_password: String,
  recovery_codes: [String],
  additional_info: String,
  image_url: { type: String, default: '' },
  is_sold: { type: Boolean, default: false },
  added_by: { type: Number },
  created_at: { type: Date, default: Date.now }
});

const OrderSchema = new mongoose.Schema({
  user_id: { type: Number, required: true },
  account_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Account' },
  type: { type: String, enum: ['account', 'boost'], required: true },
  boost_details: {
    from_rank: String,
    to_rank: String,
    region: String
  },
  status: { 
    type: String, 
    enum: ['pending', 'paid', 'completed', 'cancelled'],
    default: 'pending'
  },
  amount_usd: Number,
  amount_rub: Number,
  payment_id: String,
  created_at: { type: Date, default: Date.now }
});

// Модели
let User, Account, Order;
try {
  User = mongoose.model('User') || mongoose.model('User', UserSchema);
  Account = mongoose.model('Account') || mongoose.model('Account', AccountSchema);
  Order = mongoose.model('Order') || mongoose.model('Order', OrderSchema);
} catch {
  User = mongoose.models.User || mongoose.model('User', UserSchema);
  Account = mongoose.models.Account || mongoose.model('Account', AccountSchema);
  Order = mongoose.models.Order || mongoose.model('Order', OrderSchema);
}

// Хранилище в памяти для сессий
const memoryUsers = new Map();

// ========== ИНИЦИАЛИЗАЦИЯ БОТА ==========
const bot = new TelegramBot(process.env.TELEGRAM_TOKEN, {
  polling: {
    interval: 300,
    timeout: 10,
    autoStart: true
  },
  request: {
    timeout: 60000
  }
});

// Проверяем бота
bot.getMe()
  .then(me => console.log(`✅ Бот запущен: @${me.username}`))
  .catch(err => {
    console.error('❌ Ошибка бота:', err.message);
    process.exit(1);
  });

// ========== ВСПОМОГАТЕЛЬНЫЕ ФУНКЦИИ ==========

// Проверка прав админа
function isAdmin(userId) {
  return ADMIN_IDS.includes(Number(userId));
}

// Конвертация цены (рубли в доллары)
function convertRubToUsd(rubPrice) {
  return parseFloat((rubPrice / DOLLAR_EXCHANGE_RATE).toFixed(2));
}

// Форматирование цены
function formatPrice(rubPrice) {
  const usdPrice = convertRubToUsd(rubPrice);
  return `${rubPrice}${RUB_SYMBOL} ($${usdPrice})`;
}

// Безопасное редактирование сообщения
async function safeEditMessage(chatId, messageId, text, options = {}) {
  try {
    await bot.editMessageText(text, {
      chat_id: chatId,
      message_id: messageId,
      ...options
    });
    return true;
  } catch (error) {
    if (error.response?.body?.description?.includes('no text in the message') ||
        error.response?.body?.description?.includes('message to edit not found') ||
        error.response?.body?.description?.includes('message is not modified')) {
      console.log('⚠️ Не удалось отредактировать сообщение, отправляем новое');
      // Если не удалось отредактировать, отправляем новое сообщение
      await bot.sendMessage(chatId, text, options);
      return false;
    }
    throw error;
  }
}

// Функция автоматической отмены неоплаченных заказов через 15 минут
async function cancelUnpaidOrders() {
  try {
    const cutoffDate = new Date(Date.now() - ORDER_CLEANUP_INTERVAL);
    const result = await Order.updateMany(
      {
        status: 'pending',
        created_at: { $lt: cutoffDate }
      },
      {
        status: 'cancelled'
      }
    );
    
    if (result.modifiedCount > 0) {
      console.log(`⏰ Отменено ${result.modifiedCount} неоплаченных заказов старше 15 минут`);
      
      // Возвращаем аккаунты в продажу
      const cancelledOrders = await Order.find({
        status: 'cancelled',
        updatedAt: { $gte: new Date(Date.now() - 60000) }
      }).select('account_id');
      
      const accountIds = cancelledOrders.map(order => order.account_id);
      if (accountIds.length > 0) {
        await Account.updateMany(
          { _id: { $in: accountIds } },
          { is_sold: false }
        );
        console.log(`🔄 Возвращено в продажу ${accountIds.length} аккаунтов`);
      }
    }
  } catch (error) {
    console.error('❌ Ошибка при отмене неоплаченных заказов:', error);
  }
}

// Запускаем отмену неоплаченных заказов каждые 5 минут
setInterval(cancelUnpaidOrders, 5 * 60 * 1000);
cancelUnpaidOrders();

// ========== НОВЫЕ ФУНКЦИИ ДЛЯ УДАЛЕНИЯ АККАУНТОВ С ВЫБОРОМ ИЗ СПИСКА ==========

// Показать список аккаунтов для удаления с пагинацией
async function showAccountsForDeletion(userId, originalMessage, page = 0, filter = 'all') {
  try {
    // Определяем фильтр
    let query = {};
    if (filter === 'available') {
      query.is_sold = false;
    } else if (filter === 'sold') {
      query.is_sold = true;
    }
    
    // Получаем аккаунты с пагинацией
    const skip = page * ACCOUNTS_PER_PAGE;
    const accounts = await Account.find(query)
      .sort({ created_at: -1 })
      .skip(skip)
      .limit(ACCOUNTS_PER_PAGE);
    
    const totalAccounts = await Account.countDocuments(query);
    const totalPages = Math.ceil(totalAccounts / ACCOUNTS_PER_PAGE);
    
    if (accounts.length === 0) {
      return safeEditMessage(
        originalMessage.chat.id,
        originalMessage.message_id,
        '📭 Аккаунтов не найдено.\n\nВыберите другой фильтр или вернитесь назад.',
        {
          reply_markup: {
            inline_keyboard: [
              [
                { text: '🔄 Сбросить фильтр', callback_data: 'admin_delete_account_all_0' },
                { text: '↩️ Назад', callback_data: 'back_to_admin' }
              ]
            ]
          }
        }
      );
    }
    
    // Формируем сообщение
    let message = `🗑️ *Выберите аккаунт для удаления*\n\n`;
    message += `📊 Страница: ${page + 1}/${totalPages}\n`;
    message += `📦 Всего аккаунтов: ${totalAccounts}\n`;
    message += `🔍 Фильтр: ${getFilterName(filter)}\n\n`;
    
    const keyboard = [];
    
    // Добавляем кнопки для каждого аккаунта
    accounts.forEach((account, index) => {
      const accountNumber = skip + index + 1;
      const status = account.is_sold ? '❌ ПРОДАН' : '✅ В ПРОДАЖЕ';
      const buttonText = `${accountNumber}. ${account.title} (${account.rank}) - ${status}`;
      
      // Обрезаем текст, если он слишком длинный
      const maxLength = 30;
      const displayText = buttonText.length > maxLength 
        ? buttonText.substring(0, maxLength) + '...' 
        : buttonText;
      
      keyboard.push([
        { 
          text: displayText, 
          callback_data: `admin_delete_select_${account._id}` 
        }
      ]);
    });
    
    // Добавляем кнопки пагинации
    const paginationButtons = [];
    
    if (page > 0) {
      paginationButtons.push({ 
        text: '◀️ Назад', 
        callback_data: `admin_delete_account_${filter}_${page - 1}` 
      });
    }
    
    if (page < totalPages - 1) {
      paginationButtons.push({ 
        text: 'Вперед ▶️', 
        callback_data: `admin_delete_account_${filter}_${page + 1}` 
      });
    }
    
    if (paginationButtons.length > 0) {
      keyboard.push(paginationButtons);
    }
    
    // Кнопки фильтров
    const filterButtons = [
      { text: '📦 Все', callback_data: 'admin_delete_account_all_0' },
      { text: '✅ В продаже', callback_data: 'admin_delete_account_available_0' },
      { text: '❌ Проданные', callback_data: 'admin_delete_account_sold_0' }
    ];
    
    keyboard.push(filterButtons);
    
    // Кнопка "Назад"
    keyboard.push([
      { text: '↩️ Назад в меню', callback_data: 'back_to_admin' }
    ]);
    
    await safeEditMessage(
      originalMessage.chat.id,
      originalMessage.message_id,
      message,
      {
        parse_mode: 'Markdown',
        reply_markup: { inline_keyboard: keyboard }
      }
    );
    
  } catch (error) {
    console.error('Ошибка загрузки списка аккаунтов для удаления:', error);
    await safeEditMessage(
      originalMessage.chat.id,
      originalMessage.message_id,
      '❌ Ошибка загрузки списка аккаунтов. Попробуйте позже.'
    );
  }
}

// Получить название фильтра
function getFilterName(filter) {
  switch(filter) {
    case 'all': return 'Все аккаунты';
    case 'available': return 'В продаже';
    case 'sold': return 'Проданные';
    default: return 'Все';
  }
}

// Показать подтверждение удаления выбранного аккаунта
async function showDeleteConfirmation(userId, accountId, originalMessage) {
  try {
    const account = await Account.findById(accountId);
    
    if (!account) {
      return safeEditMessage(
        originalMessage.chat.id,
        originalMessage.message_id,
        '❌ Аккаунт не найден. Возможно, он уже был удален.',
        {
          reply_markup: {
            inline_keyboard: [
              [{ text: '↩️ Назад к списку', callback_data: 'admin_delete_account_all_0' }]
            ]
          }
        }
      );
    }
    
    const priceFormatted = formatPrice(account.price_rub);
    const status = account.is_sold ? '❌ ПРОДАН' : '✅ В ПРОДАЖЕ';
    const soldWarning = account.is_sold ? '\n\n⚠️ *Внимание!* Этот аккаунт уже продан. Удаление может повлиять на историю заказов.' : '';
    
    const message = `⚠️ *Подтверждение удаления*\n\n` +
      `*Название:* ${account.title}\n` +
      `*Ранг:* ${account.rank}\n` +
      `*Цена:* ${priceFormatted}\n` +
      `*Регион:* ${account.region}\n` +
      `*Статус:* ${status}\n` +
      `*Дата добавления:* ${new Date(account.created_at).toLocaleDateString('ru-RU')}\n` +
      soldWarning +
      `\n\n*Вы уверены, что хотите удалить этот аккаунт?*`;
    
    await safeEditMessage(
      originalMessage.chat.id,
      originalMessage.message_id,
      message,
      {
        parse_mode: 'Markdown',
        reply_markup: {
          inline_keyboard: [
            [
              { text: '✅ Да, удалить', callback_data: `admin_delete_confirm_${accountId}` },
              { text: '❌ Отменить', callback_data: 'admin_delete_account_all_0' }
            ]
          ]
        }
      }
    );
    
  } catch (error) {
    console.error('Ошибка подтверждения удаления:', error);
    await safeEditMessage(
      originalMessage.chat.id,
      originalMessage.message_id,
      '❌ Ошибка при загрузке данных аккаунта.'
    );
  }
}

// Удалить аккаунт после подтверждения
async function deleteAccountConfirmed(userId, accountId, originalMessage) {
  try {
    const account = await Account.findById(accountId);
    
    if (!account) {
      return safeEditMessage(
        originalMessage.chat.id,
        originalMessage.message_id,
        '❌ Аккаунт не найден. Возможно, он уже был удален.',
        {
          reply_markup: {
            inline_keyboard: [
              [{ text: '↩️ Назад к списку', callback_data: 'admin_delete_account_all_0' }]
            ]
          }
        }
      );
    }
    
    // Сохраняем информацию для отчета
    const accountTitle = account.title;
    const accountRank = account.rank;
    const accountPrice = formatPrice(account.price_rub);
    const accountStatus = account.is_sold ? 'ПРОДАН' : 'В ПРОДАЖЕ';
    
    // Удаляем аккаунт
    await Account.findByIdAndDelete(accountId);
    
    console.log(`🗑️ Админ ${userId} удалил аккаунт: ${accountTitle} (${accountId})`);
    
    // Показываем результат
    const message = `✅ *Аккаунт успешно удален!*\n\n` +
      `*Название:* ${accountTitle}\n` +
      `*Ранг:* ${accountRank}\n` +
      `*Цена:* ${accountPrice}\n` +
      `*Статус:* ${accountStatus}\n` +
      `*Время удаления:* ${new Date().toLocaleTimeString('ru-RU', { timeZone: 'Europe/Moscow' })}`;
    
    await safeEditMessage(
      originalMessage.chat.id,
      originalMessage.message_id,
      message,
      {
        parse_mode: 'Markdown',
        reply_markup: {
          inline_keyboard: [
            [
              { text: '🗑️ Удалить еще', callback_data: 'admin_delete_account_all_0' },
              { text: '↩️ В админ-панель', callback_data: 'back_to_admin' }
            ]
          ]
        }
      }
    );
    
  } catch (error) {
    console.error('Ошибка удаления аккаунта:', error);
    await safeEditMessage(
      originalMessage.chat.id,
      originalMessage.message_id,
      '❌ Ошибка при удалении аккаунта. Попробуйте позже.'
    );
  }
}

// ========== ОСТАЛЬНЫЕ ФУНКЦИИ (остаются без изменений) ==========

// Функция отправки данных аккаунта пользователю
async function sendAccountData(userId, account) {
  try {
    let accountData = `🎉 *Ваш аккаунт готов!*\n\n`;
    accountData += `*${account.title}*\n`;
    accountData += `🏆 Ранг: ${account.rank}\n`;
    accountData += `🌍 Регион: ${account.region}\n\n`;
    accountData += `🔐 *Данные для входа:*\n`;
    accountData += `👤 Логин: \`${account.login}\`\n`;
    accountData += `🔑 Пароль: \`${account.password}\`\n`;
    
    if (account.email) {
      accountData += `\n📧 *Привязанная почта:*\n`;
      accountData += `📧 Email: \`${account.email}\`\n`;
      if (account.email_password) {
        accountData += `🔑 Пароль от почты: \`${account.email_password}\`\n`;
      }
    }
    
    if (account.additional_info) {
      accountData += `\n📝 *Дополнительная информация:*\n`;
      accountData += `${account.additional_info}\n`;
    }
    
    accountData += `\n⚠️ *ВАЖНО!*\n`;
    accountData += `1. Смените пароль сразу после первого входа\n`;
    accountData += `2. Включите двухфакторную аутентификацию\n`;
    accountData += `3. Никому не передавайте данные аккаунта\n`;
    accountData += `4. Гарантия действует 7 дней с момента покупки\n\n`;
    accountData += `❓ По всем вопросам: @ricksxxx`;
    
    await bot.sendMessage(userId, accountData, {
      parse_mode: 'Markdown',
      reply_markup: {
        inline_keyboard: [
          [{ text: '🛒 Вернуться в каталог', callback_data: 'back_to_catalog' }],
          [{ text: '📞 Поддержка', url: 'https://t.me/ricksxxx' }]
        ]
      }
    });
    
    return true;
  } catch (error) {
    console.error('❌ Ошибка при отправке данных аккаунта:', error);
    return false;
  }
}

// Функция показа приветственного экрана
async function showWelcomeScreen(userId, username, firstName) {
  const welcomeMessage = `🎮 *Добро пожаловать в Valorant Accounts Store!*\n\n` +
    `Привет, ${firstName || username}! 👋\n\n` +
    `🏆 *Мы предлагаем:*\n` +
    `• Готовые аккаунты Valorant\n` +
    `• Различные ранги (от Iron до Radiant)\n` +
    `• Аккаунты с крутыми скинами\n` +
    `• Бустинг аккаунтов\n\n` +
    `💰 *Преимущества:*\n` +
    `• Быстрая доставка (10-15 минут)\n` +
    `• Гарантия 7 дней\n` +
    `• Поддержка 24/7\n` +
    `• Безопасная сделка\n\n` +
    `🛒 *Как купить:*\n` +
    `1. Выберите аккаунт в каталоге\n` +
    `2. Оплатите удобным способом\n` +
    `3. Получите данные в ЛС\n` +
    `4. Наслаждайтесь игрой!\n\n` +
    `❓ *Есть вопросы?*\n` +
    `Наш менеджер: @ricksxxx\n\n` +
    `👇 *Используйте кнопки ниже для навигации:*`;
  
  await bot.sendMessage(userId, welcomeMessage, {
    parse_mode: 'Markdown',
    reply_markup: {
      keyboard: [
        ['🛒 Каталог аккаунтов', '🚀 Заказать буст'],
        ['📦 Мои заказы', '👤 Профиль']
      ],
      resize_keyboard: true
    }
  });
}

async function showCatalog(userId) {
  try {
    let accounts = await Account.find({ is_sold: false }).limit(10);
    
    if (accounts.length === 0) {
      return bot.sendMessage(userId, '😔 Каталог временно пуст. Загляните позже!', {
        reply_markup: {
          keyboard: [
            ['🛒 Каталог аккаунтов', '🚀 Заказать буст'],
            ['📦 Мои заказы', '👤 Профиль'],
            ...(isAdmin(userId) ? [['👑 Админ-панель']] : [])
          ],
          resize_keyboard: true
        }
      });
    }
    
    let message = '🎮 *Каталог аккаунтов*\n\n';
    const keyboard = [];
    
    accounts.forEach((acc, index) => {
      const priceFormatted = formatPrice(acc.price_rub);
      message += `*${index + 1}. ${acc.title}*\n`;
      message += `🏆 Ранг: ${acc.rank}\n`;
      message += `💰 Цена: ${priceFormatted}\n`;
      message += `🌍 Регион: ${acc.region}\n`;
      message += `─────\n`;
      
      keyboard.push([
        { 
          text: `🛒 Купить "${acc.title}" (${priceFormatted})`, 
          callback_data: `view_${acc._id}` 
        }
      ]);
    });
    
    keyboard.push([
      { text: '💬 Связаться с менеджером', url: 'https://t.me/ricksxxx' }
    ]);
    
    keyboard.push([
      { text: '↩️ Назад в меню', callback_data: 'back_to_main_menu' }
    ]);
    
    await bot.sendMessage(userId, message, {
      parse_mode: 'Markdown',
      reply_markup: { inline_keyboard: keyboard }
    });
    
  } catch (error) {
    console.error('❌ Ошибка загрузки каталога:', error);
    await bot.sendMessage(userId, '❌ Ошибка загрузки каталога. Попробуйте позже.', {
      reply_markup: {
        keyboard: [
          ['🛒 Каталог аккаунтов', '🚀 Заказать буст'],
          ['📦 Мои заказы', '👤 Профиль'],
          ...(isAdmin(userId) ? [['👑 Админ-панель']] : [])
        ],
        resize_keyboard: true
      }
    });
  }
}

async function showAccountDetails(userId, accountId, originalMessage) {
  try {
    const account = await Account.findById(accountId);
    
    if (!account) {
      return safeEditMessage(originalMessage.chat.id, originalMessage.message_id, 'Аккаунт не найден.');
    }
    
    if (account.is_sold) {
      return safeEditMessage(originalMessage.chat.id, originalMessage.message_id, '❌ Этот аккаунт уже продан.');
    }
    
    const priceFormatted = formatPrice(account.price_rub);
    let details = `*${account.title}*\n\n`;
    details += `🏆 Ранг: ${account.rank}\n`;
    details += `💰 Цена: ${priceFormatted}\n`;
    details += `🌍 Регион: ${account.region}\n`;
    details += `📊 Уровень: ${account.level || 'Не указан'}\n`;
    
    if (account.skins && account.skins.length > 0) {
      details += `\n🎨 *Скины:*\n${account.skins.map(skin => `• ${skin}`).join('\n')}\n`;
    }
    
    if (account.agents && account.agents.length > 0) {
      details += `\n🎮 *Агенты:*\n${account.agents.map(agent => `• ${agent}`).join('\n')}\n`;
    }
    
    if (account.description) {
      details += `\n📝 *Описание:*\n${account.description}\n`;
    }
    
    // Если есть изображение, отправляем его вместе с текстом
    if (account.image_url) {
      try {
        if (account.image_url.startsWith('Ag') || account.image_url.startsWith('BQ') || 
            account.image_url.startsWith('CA') || account.image_url.startsWith('Cg')) {
          // Это file_id от Telegram
          await bot.sendPhoto(userId, account.image_url, {
            caption: details,
            parse_mode: 'Markdown',
            reply_markup: {
              inline_keyboard: [
                [{ text: `🛒 Купить сейчас (${priceFormatted})`, callback_data: `buy_${accountId}` }],
                [{ text: '📞 Консультация', url: 'https://t.me/ricksxxx' }],
                [{ text: '↩️ Назад в каталог', callback_data: 'back_to_catalog' }]
              ]
            }
          });
          return;
        } else if (account.image_url.startsWith('http')) {
          // Это URL изображения
          await bot.sendPhoto(userId, account.image_url, {
            caption: details,
            parse_mode: 'Markdown',
            reply_markup: {
              inline_keyboard: [
                [{ text: `🛒 Купить сейчас (${priceFormatted})`, callback_data: `buy_${accountId}` }],
                [{ text: '📞 Консультация', url: 'https://t.me/ricksxxx' }],
                [{ text: '↩️ Назад в каталог', callback_data: 'back_to_catalog' }]
              ]
            }
          });
          return;
        }
      } catch (photoError) {
        console.error('Ошибка отправки фото:', photoError);
        // Если не удалось отправить фото, продолжаем с текстом
      }
    }
    
    // Если нет изображения или не удалось его отправить
    await safeEditMessage(originalMessage.chat.id, originalMessage.message_id, details, {
      parse_mode: 'Markdown',
      reply_markup: {
        inline_keyboard: [
          [{ text: `🛒 Купить сейчас (${priceFormatted})`, callback_data: `buy_${accountId}` }],
          [{ text: '📞 Консультация', url: 'https://t.me/ricksxxx' }],
          [{ text: '↩️ Назад в каталог', callback_data: 'back_to_catalog' }]
        ]
      }
    });
  } catch (error) {
    console.error('Ошибка загрузки деталей аккаунта:', error);
    await safeEditMessage(originalMessage.chat.id, originalMessage.message_id, '❌ Ошибка загрузки данных аккаунта.');
  }
}

async function startPurchase(userId, accountId, originalMessage) {
  try {
    const account = await Account.findById(accountId);
    
    if (!account) {
      return safeEditMessage(originalMessage.chat.id, originalMessage.message_id, 'Аккаунт не найден.');
    }
    
    if (account.is_sold) {
      return safeEditMessage(originalMessage.chat.id, originalMessage.message_id, '❌ Этот аккаунт уже продан.');
    }
    
    const priceFormatted = formatPrice(account.price_rub);
    
    await safeEditMessage(
      originalMessage.chat.id,
      originalMessage.message_id,
      `✅ *Подтверждение покупки*\n\n` +
      `Вы покупаете:\n` +
      `*${account.title}*\n` +
      `🏆 Ранг: ${account.rank}\n` +
      `💰 Цена: *${priceFormatted}*\n\n` +
      `После оплаты:\n` +
      `1. Данные аккаунта будут отправлены вам\n` +
      `2. Смена пароля обязательна\n` +
      `3. Гарантия 7 дней\n\n` +
      `*Подтверждаете покупку?*`,
      {
        parse_mode: 'Markdown',
        reply_markup: {
          inline_keyboard: [
            [{ text: '✅ Да, покупаю!', callback_data: `confirm_${accountId}` }],
            [{ text: '❌ Отмена', callback_data: 'back_to_catalog' }]
          ]
        }
      }
    );
  } catch (error) {
    console.error('Ошибка начала покупки:', error);
    await safeEditMessage(originalMessage.chat.id, originalMessage.message_id, '❌ Ошибка при оформлении покупки.');
  }
}

async function confirmPurchase(userId, accountId, originalMessage) {
  try {
    const account = await Account.findById(accountId);
    
    if (!account) {
      return safeEditMessage(originalMessage.chat.id, originalMessage.message_id, 'Аккаунт не найден.');
    }
    
    if (account.is_sold) {
      return safeEditMessage(originalMessage.chat.id, originalMessage.message_id, '❌ Этот аккаунт уже продан.');
    }
    
    const priceFormatted = formatPrice(account.price_rub);
    
    // Создаем заказ
    const order = new Order({
      user_id: userId,
      account_id: account._id,
      type: 'account',
      amount_usd: account.price_usd,
      amount_rub: account.price_rub,
      status: 'pending'
    });
    await order.save();
    
    // Помечаем аккаунт как проданный
    await Account.findByIdAndUpdate(account._id, { is_sold: true });
    
    // Показываем методы оплаты (упрощенная версия)
    await safeEditMessage(
      originalMessage.chat.id,
      originalMessage.message_id,
      `🎉 *Заказ оформлен!*\n\n` +
      `*${account.title}*\n` +
      `Сумма к оплате: *${priceFormatted}*\n\n` +
      `*Для завершения покупки:*\n\n` +
      `1. Нажмите кнопку "💳 Перейти к оплате"\n` +
      `2. Свяжитесь с менеджером\n` +
      `3. Оплатите удобным способом\n` +
      `4. Получите данные аккаунта\n\n` +
      `*Внимание! Заказ будет автоматически отменен через 15 минут, если оплата не поступит.*`,
      {
        parse_mode: 'Markdown',
        reply_markup: {
          inline_keyboard: [
            [{ text: '💳 Перейти к оплате', url: 'https://t.me/ricksxxx' }],
            [{ text: '↩️ Назад в каталог', callback_data: 'back_to_catalog' }]
          ]
        }
      }
    );
    
    // Отправляем отдельное сообщение с инструкцией
    bot.sendMessage(userId,
      `📋 *Инструкция по получению аккаунта:*\n\n` +
      `1. Нажмите кнопку "💳 Перейти к оплате"\n` +
      `2. Свяжитесь с менеджером @ricksxxx\n` +
      `3. Оплатите ${priceFormatted} удобным способом\n` +
      `4. Отправьте скриншот оплаты менеджеру\n` +
      `5. Получите логин и пароль в личные сообщения\n` +
      `6. *Обязательно смените пароль сразу после входа!*\n\n` +
      `⏱ Срок передачи данных: 10-15 минут\n` +
      `⏰ Время на оплату: 15 минут\n` +
      `🛡 Гарантия: 7 дней на аккаунт\n` +
      `❓ Вопросы: @ricksxxx`,
      { parse_mode: 'Markdown' }
    );
    
  } catch (error) {
    console.error('Ошибка подтверждения покупки:', error);
    await safeEditMessage(originalMessage.chat.id, originalMessage.message_id, '❌ Ошибка при оформлении заказа.');
  }
}

async function showUserOrders(userId) {
  try {
    const orders = await Order.find({ 
      user_id: userId,
      status: { $in: ['paid', 'completed'] }
    }).sort({ created_at: -1 }).limit(5);
    
    if (orders.length === 0) {
      return bot.sendMessage(userId, 
        '📦 *Мои заказы*\n\n' +
        'У вас пока нет завершенных заказов.\n' +
        'Выберите аккаунт в каталоге и совершите первую покупку! 🎮',
        { 
          parse_mode: 'Markdown',
          reply_markup: {
            inline_keyboard: [
              [{ text: '🛒 Каталог аккаунтов', callback_data: 'back_to_catalog' }],
              [{ text: '↩️ Назад в меню', callback_data: 'back_to_main_menu' }]
            ]
          }
        }
      );
    }
    
    let message = '📦 *Мои заказы*\n\n';
    
    orders.forEach((order, index) => {
      const date = new Date(order.created_at).toLocaleDateString();
      const priceFormatted = formatPrice(order.amount_rub);
      message += `*Заказ #${index + 1}*\n`;
      message += `💰 Сумма: ${priceFormatted}\n`;
      message += `📦 Статус: ${order.status === 'completed' ? '✅ Выполнен' : '💰 Оплачен'}\n`;
      message += `📅 Дата: ${date}\n`;
      
      if (order.status === 'paid') {
        message += `✅ Ожидайте данные в ЛС\n`;
      } else if (order.status === 'completed') {
        message += `🎉 Аккаунт передан\n`;
      }
      
      message += `─────\n`;
    });
    
    bot.sendMessage(userId, message, { 
      parse_mode: 'Markdown',
      reply_markup: {
        inline_keyboard: [
          [{ text: '🛒 Новый заказ', callback_data: 'new_order' }],
          [{ text: '↩️ Назад в меню', callback_data: 'back_to_main_menu' }]
        ]
      }
    });
  } catch (error) {
    console.error('Ошибка загрузки заказов:', error);
    bot.sendMessage(userId, '❌ Ошибка загрузки заказов. Попробуйте позже.', {
      reply_markup: {
        keyboard: [
          ['🛒 Каталог аккаунтов', '🚀 Заказать буст'],
          ['📦 Мои заказы', '👤 Профиль'],
          ...(isAdmin(userId) ? [['👑 Админ-панель']] : [])
        ],
        resize_keyboard: true
      }
    });
  }
}

async function showUserProfile(userId, msg) {
  try {
    const userData = await User.findOne({ user_id: userId });
    const orderCount = await Order.countDocuments({ 
      user_id: userId,
      status: { $in: ['paid', 'completed'] }
    });
    
    const joinDate = userData ? 
      new Date(userData.created_at).toLocaleDateString() : 
      'сегодня';
    
    bot.sendMessage(userId, 
      `👤 *Ваш профиль*\n\n` +
      `ID: ${userId}\n` +
      `Имя: ${msg.from.first_name || '—'}\n` +
      `Username: ${msg.from.username ? '@' + msg.from.username : '—'}\n` +
      `С нами с: ${joinDate}\n` +
      `🛒 Заказов: ${orderCount}\n` +
      `💎 Статус: ${orderCount >= 3 ? 'Постоянный клиент' : 'Новый клиент'}\n\n` +
      `🎁 Бонус: ${orderCount >= 2 ? 'Следующая покупка со скидкой 5%!' : 'Сделайте 2 покупки для получения скидки'}`,
      { 
        parse_mode: 'Markdown',
        reply_markup: {
          inline_keyboard: [
            [{ text: '↩️ Назад в меню', callback_data: 'back_to_main_menu' }]
          ]
        }
      }
    );
  } catch (error) {
    console.error('Ошибка загрузки профиля:', error);
    bot.sendMessage(userId, '❌ Ошибка загрузки профиля. Попробуйте позже.', {
      reply_markup: {
        keyboard: [
          ['🛒 Каталог аккаунтов', '🚀 Заказать буст'],
          ['📦 Мои заказы', '👤 Профиль'],
          ...(isAdmin(userId) ? [['👑 Админ-панель']] : [])
        ],
        resize_keyboard: true
      }
    });
  }
}

// Функция подтверждения оплаты админом
async function confirmPayment(userId, orderId, originalMessage) {
  try {
    const order = await Order.findById(orderId).populate('account_id');
    
    if (!order) {
      return safeEditMessage(originalMessage.chat.id, originalMessage.message_id, '❌ Заказ не найден.');
    }
    
    if (order.status !== 'pending') {
      return safeEditMessage(
        originalMessage.chat.id,
        originalMessage.message_id,
        `❌ Заказ уже обработан. Статус: ${order.status}`
      );
    }
    
    // Обновляем статус заказа
    order.status = 'completed';
    await order.save();
    
    // Отправляем данные аккаунта пользователю
    const account = order.account_id;
    if (!account) {
      return safeEditMessage(
        originalMessage.chat.id,
        originalMessage.message_id,
        '❌ Аккаунт не найден в заказе.'
      );
    }
    
    // Отправляем данные пользователю
    const sent = await sendAccountData(order.user_id, account);
    
    if (sent) {
      await safeEditMessage(
        originalMessage.chat.id,
        originalMessage.message_id,
        `✅ *Оплата подтверждена!*\n\n` +
        `Заказ #${order._id}\n` +
        `Пользователь: ${order.user_id}\n` +
        `Аккаунт: ${account.title}\n` +
        `Сумма: ${formatPrice(order.amount_rub)}\n\n` +
        `✅ Данные аккаунта отправлены пользователю.`,
        {
          parse_mode: 'Markdown',
          reply_markup: {
            inline_keyboard: [
              [{ text: '📋 Все заказы', callback_data: 'admin_manage_orders' }],
              [{ text: '↩️ Назад', callback_data: 'back_to_admin' }]
            ]
          }
        }
      );
    } else {
      await safeEditMessage(
        originalMessage.chat.id,
        originalMessage.message_id,
        `⚠️ *Оплата подтверждена, но возникла ошибка при отправке данных*\n\n` +
        `Пользователю нужно отправить данные вручную.\n` +
        `ID аккаунта: \`${account._id}\``,
        {
          parse_mode: 'Markdown',
          reply_markup: {
            inline_keyboard: [
              [{ text: '📋 Все заказы', callback_data: 'admin_manage_orders' }],
              [{ text: '↩️ Назад', callback_data: 'back_to_admin' }]
            ]
          }
        }
      );
    }
    
  } catch (error) {
    console.error('Ошибка подтверждения оплаты:', error);
    await safeEditMessage(
      originalMessage.chat.id,
      originalMessage.message_id,
      '❌ Ошибка при подтверждении оплаты: ' + error.message
    );
  }
}

// Функция сброса статистики
async function resetStatistics(userId, originalMessage) {
  try {
    const deletedAccounts = await Account.deleteMany({});
    const deletedOrders = await Order.deleteMany({});
    
    await safeEditMessage(
      originalMessage.chat.id,
      originalMessage.message_id,
      `✅ *Статистика сброшена!*\n\n` +
      `Удалено:\n` +
      `📦 Аккаунтов: ${deletedAccounts.deletedCount}\n` +
      `🛒 Заказов: ${deletedOrders.deletedCount}\n\n` +
      `База данных очищена.`,
      {
        parse_mode: 'Markdown',
        reply_markup: {
          inline_keyboard: [
            [{ text: '📊 Статистика', callback_data: 'admin_stats' }],
            [{ text: '↩️ Назад', callback_data: 'back_to_admin' }]
          ]
        }
      }
    );
    
    console.log(`🧹 Сброс статистики: удалено ${deletedAccounts.deletedCount} аккаунтов и ${deletedOrders.deletedCount} заказов`);
    
  } catch (error) {
    console.error('Ошибка сброса статистики:', error);
    await safeEditMessage(
      originalMessage.chat.id,
      originalMessage.message_id,
      '❌ Ошибка при сбросе статистики: ' + error.message
    );
  }
}

// ========== ОСНОВНЫЕ ОБРАБОТЧИКИ ==========

// /start
bot.onText(/\/start/, async (msg) => {
  const userId = msg.from.id;
  const username = msg.from.username || 'Гость';
  const firstName = msg.from.first_name || username;
  
  try {
    let user = await User.findOne({ user_id: userId });
    if (!user) {
      user = new User({ 
        user_id: userId, 
        username, 
        first_name: firstName,
        has_seen_welcome: false
      });
      await user.save();
      
      await showWelcomeScreen(userId, username, firstName);
      await User.updateOne({ user_id: userId }, { has_seen_welcome: true });
    } else {
      if (!user.has_seen_welcome) {
        await showWelcomeScreen(userId, username, firstName);
        await User.updateOne({ user_id: userId }, { has_seen_welcome: true });
      } else {
        const isUserAdmin = isAdmin(userId);
        const baseKeyboard = [
          ['🛒 Каталог аккаунтов', '🚀 Заказать буст'],
          ['📦 Мои заказы', '👤 Профиль']
        ];

        if (isUserAdmin) {
          baseKeyboard.push(['👑 Админ-панель']);
        }

        bot.sendMessage(userId, `🎮 С возвращением, ${firstName}!`, {
          reply_markup: {
            keyboard: baseKeyboard,
            resize_keyboard: true
          }
        });
      }
    }
    
    console.log(`👤 Пользователь: ${username} (${userId})`);
    
  } catch (error) {
    console.error('Ошибка при старте:', error);
    bot.sendMessage(userId, '❌ Ошибка при запуске бота. Попробуйте позже.');
  }
});

// Обработка кнопок меню
bot.on('message', async (msg) => {
  const text = msg.text;
  const userId = msg.from.id;
  
  if (!text || text.startsWith('/')) return;
  
  console.log(`📨 Кнопка от ${userId}: ${text}`);
  
  switch(text) {
    case '🛒 Каталог аккаунтов':
      await showCatalog(userId);
      break;
      
    case '🚀 Заказать буст':
      bot.sendMessage(userId, '🎯 *Выберите тип буста:*', {
        parse_mode: 'Markdown',
        reply_markup: {
          inline_keyboard: [
            [
              { text: 'Iron → Gold (4750₽/$50)', callback_data: 'boost_iron_gold' },
              { text: 'Gold → Platinum (7600₽/$80)', callback_data: 'boost_gold_plat' }
            ],
            [
              { text: 'Plat → Diamond (11400₽/$120)', callback_data: 'boost_plat_dia' },
              { text: 'Dia → Immortal (19000₽/$200)', callback_data: 'boost_dia_imm' }
            ],
            [
              { text: '💬 Консультация', url: 'https://t.me/ricksxxx' }
            ],
            [
              { text: '↩️ Назад в меню', callback_data: 'back_to_main_menu' }
            ]
          ]
        }
      });
      break;
      
    case '📦 Мои заказы':
      await showUserOrders(userId);
      break;
      
    case '👤 Профиль':
      await showUserProfile(userId, msg);
      break;
      
    case '👑 Админ-панель':
      if (!isAdmin(userId)) {
        return bot.sendMessage(userId, '❌ Недостаточно прав.');
      }
      
      bot.sendMessage(userId, '👑 *Админ-панель*\nВыберите действие:', {
        parse_mode: 'Markdown',
        reply_markup: {
          inline_keyboard: [
            [
              { text: '📊 Статистика', callback_data: 'admin_stats' },
              { text: '📦 Все аккаунты', callback_data: 'admin_all_accounts' }
            ],
            [
              { text: '🔧 Действия с аккаунтами', callback_data: 'admin_account_actions' },
              { text: '🛒 Управление заказами', callback_data: 'admin_manage_orders' }
            ],
            [
              { text: '👥 Пользователи', callback_data: 'admin_users' }
            ],
            [
              { text: '↩️ Назад в меню', callback_data: 'back_to_main_menu' }
            ]
          ]
        }
      });
      break;
      
    default:
      bot.sendMessage(userId, 'Используйте кнопки меню или команду /start');
  }
});

// Обработка inline-кнопок (основные)
bot.on('callback_query', async (callbackQuery) => {
  const { data, from, message } = callbackQuery;
  const userId = from.id;
  
  console.log(`🔘 Нажата кнопка: ${data} от ${userId}`);
  
  try {
    // === ОБРАБОТКА НОВЫХ КОМАНД ДЛЯ УДАЛЕНИЯ АККАУНТОВ ===
    if (data.startsWith('admin_delete_account_')) {
      // Формат: admin_delete_account_[filter]_[page]
      const parts = data.split('_');
      if (parts.length >= 5) {
        const filter = parts[3]; // all, available, sold
        const page = parseInt(parts[4]) || 0;
        await showAccountsForDeletion(userId, message, page, filter);
      }
    }
    
    else if (data.startsWith('admin_delete_select_')) {
      // Формат: admin_delete_select_[accountId]
      const accountId = data.replace('admin_delete_select_', '');
      await showDeleteConfirmation(userId, accountId, message);
    }
    
    else if (data.startsWith('admin_delete_confirm_')) {
      // Формат: admin_delete_confirm_[accountId]
      const accountId = data.replace('admin_delete_confirm_', '');
      await deleteAccountConfirmed(userId, accountId, message);
    }
    
    // === СТАРЫЕ КОМАНДЫ ===
    else if (data.startsWith('view_')) {
      const accountId = data.replace('view_', '');
      await showAccountDetails(userId, accountId, message);
    }
    
    else if (data.startsWith('buy_')) {
      const accountId = data.replace('buy_', '');
      await startPurchase(userId, accountId, message);
    }
    
    else if (data.startsWith('confirm_')) {
      const accountId = data.replace('confirm_', '');
      await confirmPurchase(userId, accountId, message);
    }
    
    else if (data.startsWith('pay_confirm_')) {
      const orderId = data.replace('pay_confirm_', '');
      await confirmPayment(userId, orderId, message);
    }
    
    else if (data === 'admin_reset_stats') {
      await resetStatistics(userId, message);
    }
    
    else if (data === 'admin_confirm_reset') {
      await resetStatistics(userId, message);
    }
    
    else if (data === 'admin_cancel_reset') {
      await safeEditMessage(message.chat.id, message.message_id, '❌ Сброс статистики отменен.', {
        reply_markup: {
          inline_keyboard: [
            [{ text: '↩️ Назад', callback_data: 'back_to_admin' }]
          ]
        }
      });
    }
    
    else if (data.startsWith('boost_')) {
      bot.sendMessage(userId, 
        `🎮 *Заказ буста*\n\n` +
        'Для оформления заказа свяжитесь с менеджером: @ricksxxx\n\n' +
        'Укажите в сообщении:\n' +
        '1. Ваш текущий ранг\n' +
        '2. Желаемый ранг\n' +
        '3. Регион игры\n' +
        '4. Предпочитаемое время выполнения',
        { 
          parse_mode: 'Markdown',
          reply_markup: {
            inline_keyboard: [
              [{ text: '↩️ Назад в меню', callback_data: 'back_to_main_menu' }]
            ]
          }
        }
      );
    }
    
    else if (data === 'back_to_catalog' || data === 'new_order') {
      await showCatalog(userId);
    }
    
    else if (data === 'back_to_main_menu') {
      const isUserAdmin = isAdmin(userId);
      const baseKeyboard = [
        ['🛒 Каталог аккаунтов', '🚀 Заказать буст'],
        ['📦 Мои заказы', '👤 Профиль']
      ];

      if (isUserAdmin) {
        baseKeyboard.push(['👑 Админ-панель']);
      }

      await bot.sendMessage(userId, 'Главное меню:', {
        reply_markup: {
          keyboard: baseKeyboard,
          resize_keyboard: true
        }
      });
    }
    
    else if (data === 'cancel') {
      await safeEditMessage(message.chat.id, message.message_id, 'Покупка отменена.', {
        reply_markup: {
          inline_keyboard: [
            [{ text: '↩️ Назад в каталог', callback_data: 'back_to_catalog' }]
          ]
        }
      });
    }
    
    else if (data.startsWith('admin_')) {
      await handleAdminCallback(data, userId, message, callbackQuery.id);
    }
    
    else if (data === 'back_to_admin') {
      await safeEditMessage(message.chat.id, message.message_id, '👑 *Админ-панель*\nВыберите действие:', {
        parse_mode: 'Markdown',
        reply_markup: {
          inline_keyboard: [
            [
              { text: '📊 Статистика', callback_data: 'admin_stats' },
              { text: '📦 Все аккаунты', callback_data: 'admin_all_accounts' }
            ],
            [
              { text: '🔧 Действия с аккаунтами', callback_data: 'admin_account_actions' },
              { text: '🛒 Управление заказами', callback_data: 'admin_manage_orders' }
            ],
            [
              { text: '👥 Пользователи', callback_data: 'admin_users' }
            ],
            [
              { text: '↩️ Назад в меню', callback_data: 'back_to_main_menu' }
            ]
          ]
        }
      });
    }
    
    if (!data.startsWith('admin_')) {
      await bot.answerCallbackQuery(callbackQuery.id);
    }
    
  } catch (error) {
    console.error('Ошибка callback:', error);
    
    // Пытаемся ответить на callback_query
    try {
      await bot.answerCallbackQuery(callbackQuery.id, { text: 'Произошла ошибка' });
    } catch (answerError) {
      // Игнорируем ошибку ответа
    }
    
    // Отправляем сообщение об ошибке пользователю
    try {
      const isUserAdmin = isAdmin(userId);
      const baseKeyboard = [
        ['🛒 Каталог аккаунтов', '🚀 Заказать буст'],
        ['📦 Мои заказы', '👤 Профиль']
      ];

      if (isUserAdmin) {
        baseKeyboard.push(['👑 Админ-панель']);
      }

      await bot.sendMessage(userId, '⚠️ Произошла ошибка. Возвращаем в главное меню.', {
        reply_markup: {
          keyboard: baseKeyboard,
          resize_keyboard: true
        }
      });
    } catch (sendError) {
      console.error('Не удалось отправить сообщение об ошибке:', sendError);
    }
  }
});

// ========== АДМИН-ФУНКЦИИ ==========

// Обработка админ-кнопок
async function handleAdminCallback(data, userId, message, callbackQueryId) {
  if (!isAdmin(userId)) {
    try {
      await bot.answerCallbackQuery(callbackQueryId, { text: 'Недостаточно прав' });
    } catch (error) {
      // Игнорируем
    }
    return;
  }
  
  try {
    switch(data) {
      case 'admin_stats':
        await showAdminStats(userId, message);
        break;
        
      case 'admin_all_accounts':
        await showAllAccounts(userId, message);
        break;
        
      case 'admin_account_actions':
        await showAccountActions(userId, message);
        break;
        
      case 'admin_add_account':
        await startAdminAddAccount(userId, message);
        break;
        
      case 'admin_delete_account':
        // Теперь это ведет на список выбора аккаунтов
        await showAccountsForDeletion(userId, message, 0, 'all');
        break;
        
      case 'admin_manage_orders':
        await showOrderManagement(userId, message);
        break;
        
      case 'admin_pending_orders':
        await showPendingOrders(userId, message);
        break;
        
      case 'admin_completed_orders':
        await showCompletedOrders(userId, message);
        break;
        
      case 'admin_cancelled_orders':
        await showCancelledOrders(userId, message);
        break;
        
      case 'admin_users':
        await showAllUsers(userId, message);
        break;
    }
    
    await bot.answerCallbackQuery(callbackQueryId);
  } catch (error) {
    console.error('Ошибка в админ-обработчике:', error);
    try {
      await bot.answerCallbackQuery(callbackQueryId, { text: 'Ошибка: ' + error.message });
    } catch (answerError) {
      // Игнорируем
    }
  }
}

async function showAdminStats(userId, originalMessage) {
  try {
    const totalAccounts = await Account.countDocuments();
    const availableAccounts = await Account.countDocuments({ is_sold: false });
    const soldAccounts = await Account.countDocuments({ is_sold: true });
    const totalUsers = await User.countDocuments();
    const totalOrders = await Order.countDocuments();
    
    const soldAccountsData = await Account.find({ is_sold: true });
    const totalRevenueUsd = soldAccountsData.reduce((sum, acc) => sum + acc.price_usd, 0);
    const totalRevenueRub = soldAccountsData.reduce((sum, acc) => sum + acc.price_rub, 0);
    
    const message = `📊 *Статистика магазина*\n\n` +
      `📦 *Аккаунты:*\n` +
      `   Всего: ${totalAccounts}\n` +
      `   В продаже: ${availableAccounts}\n` +
      `   Продано: ${soldAccounts}\n\n` +
      `👥 *Пользователи:* ${totalUsers}\n` +
      `🛒 *Заказы:* ${totalOrders}\n\n` +
      `💰 *Финансы:*\n` +
      `   Общая выручка: ${totalRevenueRub}${RUB_SYMBOL} ($${totalRevenueUsd.toFixed(2)})\n` +
      `   Средний чек: ${soldAccounts > 0 ? Math.round(totalRevenueRub / soldAccounts) : 0}${RUB_SYMBOL}\n\n` +
      `🕐 Обновлено: ${new Date().toLocaleTimeString('ru-RU', { timeZone: 'Europe/Moscow' })}`;
    
    await safeEditMessage(originalMessage.chat.id, originalMessage.message_id, message, {
      parse_mode: 'Markdown',
      reply_markup: {
        inline_keyboard: [
          [
            { text: '🔄 Обновить', callback_data: 'admin_stats' },
            { text: '🧹 Сбросить статистику', callback_data: 'admin_show_reset_confirm' }
          ],
          [{ text: '↩️ Назад', callback_data: 'back_to_admin' }]
        ]
      }
    });
    
  } catch (error) {
    console.error('Ошибка статистики:', error);
    await safeEditMessage(
      originalMessage.chat.id,
      originalMessage.message_id,
      '❌ Ошибка загрузки статистики: ' + error.message
    );
  }
}

// Показать подтверждение сброса статистики
bot.on('callback_query', async (callbackQuery) => {
  const { data, from, message } = callbackQuery;
  const userId = from.id;
  
  if (data === 'admin_show_reset_confirm' && isAdmin(userId)) {
    await safeEditMessage(
      message.chat.id,
      message.message_id,
      `⚠️ *Подтверждение сброса статистики*\n\n` +
      `Вы собираетесь сбросить всю статистику магазина:\n\n` +
      `📦 *Будут удалены:*\n` +
      `• Все аккаунты\n` +
      `• Все заказы\n\n` +
      `👥 *Пользователи НЕ будут удалены*\n\n` +
      `*Это действие нельзя отменить!*\n` +
      `Вы уверены, что хотите сбросить статистику?`,
      {
        parse_mode: 'Markdown',
        reply_markup: {
          inline_keyboard: [
            [{ text: '✅ Да, сбросить', callback_data: 'admin_confirm_reset' }],
            [{ text: '❌ Отмена', callback_data: 'admin_cancel_reset' }]
          ]
        }
      }
    );
    
    try {
      await bot.answerCallbackQuery(callbackQuery.id);
    } catch (error) {
      // Игнорируем
    }
  }
});

async function showAllAccounts(userId, originalMessage) {
  try {
    const accounts = await Account.find({}).sort({ created_at: -1 }).limit(10);
    
    if (accounts.length === 0) {
      return safeEditMessage(originalMessage.chat.id, originalMessage.message_id, '📭 База аккаунтов пуста.', {
        reply_markup: {
          inline_keyboard: [
            [{ text: '↩️ Назад', callback_data: 'back_to_admin' }]
          ]
        }
      });
    }
    
    let message = '📋 *Последние 10 аккаунтов:*\n\n';
    
    accounts.forEach((acc, index) => {
      const priceFormatted = formatPrice(acc.price_rub);
      message += `*${index + 1}. ${acc.title}*\n`;
      message += `   🆔: \`${acc._id}\`\n`;
      message += `   🏆: ${acc.rank} | 💰: ${priceFormatted}\n`;
      message += `   🌍: ${acc.region}\n`;
      message += `   📦: ${acc.is_sold ? '❌ ПРОДАН' : '✅ В продаже'}\n`;
      message += `   ─────\n`;
    });
    
    message += `\n📊 Всего: ${await Account.countDocuments()} аккаунтов`;
    
    await safeEditMessage(originalMessage.chat.id, originalMessage.message_id, message, {
      parse_mode: 'Markdown',
      reply_markup: {
        inline_keyboard: [
          [{ text: '↩️ Назад', callback_data: 'back_to_admin' }]
        ]
      }
    });
    
  } catch (error) {
    console.error('Ошибка загрузки аккаунтов:', error);
    await safeEditMessage(
      originalMessage.chat.id,
      originalMessage.message_id,
      '❌ Ошибка загрузки аккаунтов: ' + error.message
    );
  }
}

async function showAccountActions(userId, originalMessage) {
  await safeEditMessage(
    originalMessage.chat.id,
    originalMessage.message_id,
    '🔧 *Действия с аккаунтами*\n\nВыберите действие:',
    {
      parse_mode: 'Markdown',
      reply_markup: {
        inline_keyboard: [
          [{ text: '➕ Добавить аккаунт', callback_data: 'admin_add_account' }],
          [{ text: '🗑️ Удалить аккаунт', callback_data: 'admin_delete_account' }],
          [{ text: '↩️ Назад', callback_data: 'back_to_admin' }]
        ]
      }
    }
  );
}

async function showOrderManagement(userId, originalMessage) {
  try {
    const pendingCount = await Order.countDocuments({ status: 'pending' });
    const completedCount = await Order.countDocuments({ status: 'completed' });
    const cancelledCount = await Order.countDocuments({ status: 'cancelled' });
    
    await safeEditMessage(
      originalMessage.chat.id,
      originalMessage.message_id,
      '🛒 *Управление заказами*\n\n' +
      `⏳ Ожидают оплаты: ${pendingCount}\n` +
      `✅ Выполненные: ${completedCount}\n` +
      `❌ Отмененные: ${cancelledCount}\n\n` +
      'Выберите раздел для просмотра:',
      {
        parse_mode: 'Markdown',
        reply_markup: {
          inline_keyboard: [
            [{ text: '⏳ Ожидают оплаты', callback_data: 'admin_pending_orders' }],
            [{ text: '✅ Выполненные', callback_data: 'admin_completed_orders' }],
            [{ text: '❌ Отмененные', callback_data: 'admin_cancelled_orders' }],
            [{ text: '↩️ Назад', callback_data: 'back_to_admin' }]
          ]
        }
      }
    );
  } catch (error) {
    console.error('Ошибка загрузки управления заказами:', error);
    await safeEditMessage(
      originalMessage.chat.id,
      originalMessage.message_id,
      '❌ Ошибка загрузки: ' + error.message
    );
  }
}

async function showPendingOrders(userId, originalMessage) {
  try {
    const orders = await Order.find({ status: 'pending' })
      .populate('account_id')
      .sort({ created_at: -1 })
      .limit(10);
    
    if (orders.length === 0) {
      return safeEditMessage(
        originalMessage.chat.id,
        originalMessage.message_id,
        '⏳ *Ожидающие оплаты*\n\nНет заказов, ожидающих оплаты.',
        {
          parse_mode: 'Markdown',
          reply_markup: {
            inline_keyboard: [
              [{ text: '🛒 Управление заказами', callback_data: 'admin_manage_orders' }],
              [{ text: '↩️ Назад', callback_data: 'back_to_admin' }]
            ]
          }
        }
      );
    }
    
    let message = '⏳ *Ожидающие оплаты (последние 10)*\n\n';
    
    orders.forEach((order, index) => {
      const account = order.account_id;
      const date = new Date(order.created_at).toLocaleTimeString('ru-RU', { timeZone: 'Europe/Moscow' });
      const timeAgo = Math.round((new Date() - order.created_at) / 60000);
      const priceFormatted = formatPrice(order.amount_rub);
      
      message += `*Заказ #${index + 1}*\n`;
      message += `🆔: \`${order._id}\`\n`;
      message += `👤 Покупатель: ${order.user_id}\n`;
      if (account) {
        message += `🎮 Аккаунт: ${account.title}\n`;
      }
      message += `💰 Сумма: ${priceFormatted}\n`;
      message += `⏰ Создан: ${date} (${timeAgo} мин. назад)\n`;
      message += `─────\n`;
    });
    
    const keyboard = [];
    
    orders.forEach(order => {
      keyboard.push([
        { 
          text: `✅ Подтвердить оплату #${order._id.toString().slice(-6)}`, 
          callback_data: `pay_confirm_${order._id}` 
        }
      ]);
    });
    
    keyboard.push([
      { text: '🛒 Управление заказами', callback_data: 'admin_manage_orders' },
      { text: '↩️ Назад', callback_data: 'back_to_admin' }
    ]);
    
    await safeEditMessage(originalMessage.chat.id, originalMessage.message_id, message, {
      parse_mode: 'Markdown',
      reply_markup: {
        inline_keyboard: keyboard
      }
    });
    
  } catch (error) {
    console.error('Ошибка загрузки ожидающих заказов:', error);
    await safeEditMessage(
      originalMessage.chat.id,
      originalMessage.message_id,
      '❌ Ошибка загрузки: ' + error.message
    );
  }
}

async function showCompletedOrders(userId, originalMessage) {
  try {
    const orders = await Order.find({ status: 'completed' })
      .populate('account_id')
      .sort({ created_at: -1 })
      .limit(10);
    
    if (orders.length === 0) {
      return safeEditMessage(
        originalMessage.chat.id,
        originalMessage.message_id,
        '✅ *Выполненные заказы*\n\nНет выполненных заказов.',
        {
          parse_mode: 'Markdown',
          reply_markup: {
            inline_keyboard: [
              [{ text: '🛒 Управление заказами', callback_data: 'admin_manage_orders' }],
              [{ text: '↩️ Назад', callback_data: 'back_to_admin' }]
            ]
          }
        }
      );
    }
    
    let message = '✅ *Выполненные заказы (последние 10)*\n\n';
    
    orders.forEach((order, index) => {
      const account = order.account_id;
      const date = new Date(order.created_at).toLocaleDateString('ru-RU', { timeZone: 'Europe/Moscow' });
      const priceFormatted = formatPrice(order.amount_rub);
      
      message += `*Заказ #${index + 1}*\n`;
      message += `🆔: \`${order._id}\`\n`;
      message += `👤 Покупатель: ${order.user_id}\n`;
      if (account) {
        message += `🎮 Аккаунт: ${account.title}\n`;
      }
      message += `💰 Сумма: ${priceFormatted}\n`;
      message += `📅 Дата: ${date}\n`;
      message += `─────\n`;
    });
    
    await safeEditMessage(originalMessage.chat.id, originalMessage.message_id, message, {
      parse_mode: 'Markdown',
      reply_markup: {
        inline_keyboard: [
          [
            { text: '🛒 Управление заказами', callback_data: 'admin_manage_orders' },
            { text: '↩️ Назад', callback_data: 'back_to_admin' }
          ]
        ]
      }
    });
    
  } catch (error) {
    console.error('Ошибка загрузки выполненных заказов:', error);
    await safeEditMessage(
      originalMessage.chat.id,
      originalMessage.message_id,
      '❌ Ошибка загрузки: ' + error.message
    );
  }
}

async function showCancelledOrders(userId, originalMessage) {
  try {
    const orders = await Order.find({ status: 'cancelled' })
      .populate('account_id')
      .sort({ created_at: -1 })
      .limit(10);
    
    if (orders.length === 0) {
      return safeEditMessage(
        originalMessage.chat.id,
        originalMessage.message_id,
        '❌ *Отмененные заказы*\n\nНет отмененных заказов.',
        {
          parse_mode: 'Markdown',
          reply_markup: {
            inline_keyboard: [
              [{ text: '🛒 Управление заказами', callback_data: 'admin_manage_orders' }],
              [{ text: '↩️ Назад', callback_data: 'back_to_admin' }]
            ]
          }
        }
      );
    }
    
    let message = '❌ *Отмененные заказы (последние 10)*\n\n';
    
    orders.forEach((order, index) => {
      const account = order.account_id;
      const date = new Date(order.created_at).toLocaleDateString('ru-RU', { timeZone: 'Europe/Moscow' });
      const priceFormatted = formatPrice(order.amount_rub);
      
      message += `*Заказ #${index + 1}*\n`;
      message += `🆔: \`${order._id}\`\n`;
      message += `👤 Покупатель: ${order.user_id}\n`;
      if (account) {
        message += `🎮 Аккаунт: ${account.title}\n`;
        message += `📦 Аккаунт возвращен в продажу: ${account.is_sold ? 'Нет' : 'Да'}\n`;
      }
      message += `💰 Сумма: ${priceFormatted}\n`;
      message += `📅 Дата: ${date}\n`;
      message += `─────\n`;
    });
    
    await safeEditMessage(originalMessage.chat.id, originalMessage.message_id, message, {
      parse_mode: 'Markdown',
      reply_markup: {
        inline_keyboard: [
          [
            { text: '🛒 Управление заказами', callback_data: 'admin_manage_orders' },
            { text: '↩️ Назад', callback_data: 'back_to_admin' }
          ]
        ]
      }
    });
    
  } catch (error) {
    console.error('Ошибка загрузки отмененных заказов:', error);
    await safeEditMessage(
      originalMessage.chat.id,
      originalMessage.message_id,
      '❌ Ошибка загрузки: ' + error.message
    );
  }
}

async function startAdminAddAccount(userId, originalMessage) {
  if (!memoryUsers.get(userId)) memoryUsers.set(userId, {});
  memoryUsers.get(userId).adminAccountForm = { step: 'waiting_title' };
  
  await safeEditMessage(
    originalMessage.chat.id,
    originalMessage.message_id,
    '📝 *Добавление нового аккаунта*\n\n' +
    'Шаг 1/12: Отправьте *название* аккаунта:\n' +
    'Пример: *Аккаунт Radiant с Prime Vandal*\n\n' +
    'Отправьте "отмена" для отмены',
    {
      parse_mode: 'Markdown'
    }
  );
}

// Убрана старая функция startAdminDeleteAccount, заменена на showAccountsForDeletion

// Обработка админ-формы добавления
bot.on('message', async (msg) => {
  const userId = msg.from.id;
  const text = msg.text;
  const photo = msg.photo;
  
  if (!text && !photo) return;
  if (text && text.startsWith('/')) return;
  
  const userState = memoryUsers.get(userId);
  if (!userState) return;
  
  // Проверка на отмену (только текстовое сообщение)
  if (text && text.toLowerCase() === 'отмена') {
    if (userState.adminAccountForm) delete userState.adminAccountForm;
    
    return bot.sendMessage(userId, '❌ Операция отменена.', {
      reply_markup: {
        keyboard: [
          ['🛒 Каталог аккаунтов', '🚀 Заказать буст'],
          ['📦 Мои заказы', '👤 Профиль'],
          ['👑 Админ-панель']
        ],
        resize_keyboard: true
      }
    });
  }
  
  // Обработка формы добавления аккаунта (текст или фото)
  if (userState.adminAccountForm && (text || photo)) {
    await handleAddAccountForm(userId, text, msg, userState.adminAccountForm);
    return;
  }
});

async function handleAddAccountForm(userId, text, msg, formState) {
  const { step, data = {} } = formState;
  const photo = msg.photo;
  
  try {
    switch(step) {
      case 'waiting_title':
        if (!text) return bot.sendMessage(userId, '❌ Пожалуйста, отправьте текст.');
        data.title = text;
        formState.step = 'waiting_rank';
        formState.data = data;
        
        bot.sendMessage(userId,
          '✅ *Название сохранено!*\n\n' +
          'Шаг 2/12: Отправьте *ранг* аккаунта:\n' +
          'Пример: *Radiant 500 RR* или *Immortal 3*\n' +
          'Можно указать любой ранг вручную',
          { parse_mode: 'Markdown' }
        );
        break;
        
      case 'waiting_rank':
        if (!text) return bot.sendMessage(userId, '❌ Пожалуйста, отправьте текст.');
        data.rank = text;
        formState.step = 'waiting_price_rub';
        formState.data = data;
        
        bot.sendMessage(userId,
          '✅ *Ранг сохранен!*\n\n' +
          'Шаг 3/12: Отправьте *цену в рублях* (только цифры):\n' +
          'Пример: *8550* (будет конвертировано в доллары автоматически)',
          { parse_mode: 'Markdown' }
        );
        break;
        
      case 'waiting_price_rub':
        if (!text) return bot.sendMessage(userId, '❌ Пожалуйста, отправьте текст.');
        const priceRub = parseInt(text);
        if (isNaN(priceRub) || priceRub <= 0) {
          return bot.sendMessage(userId, '❌ Неверная цена. Введите число больше 0.');
        }
        
        data.price_rub = priceRub;
        data.price_usd = convertRubToUsd(priceRub);
        formState.step = 'waiting_region';
        formState.data = data;
        
        bot.sendMessage(userId,
          `✅ *Цена сохранена!*\n` +
          `💰 ${priceRub}${RUB_SYMBOL} = $${data.price_usd.toFixed(2)}\n\n` +
          'Шаг 4/12: Отправьте *регион*:\n' +
          'Доступные: CIS, EU, NA, APAC, BR, LATAM',
          { parse_mode: 'Markdown' }
        );
        break;
        
      case 'waiting_region':
        if (!text) return bot.sendMessage(userId, '❌ Пожалуйста, отправьте текст.');
        const validRegions = ['CIS', 'EU', 'NA', 'APAC', 'BR', 'LATAM'];
        if (!validRegions.includes(text)) {
          return bot.sendMessage(userId, '❌ Неверный регион. Выберите из списка выше.');
        }
        
        data.region = text;
        formState.step = 'waiting_description';
        formState.data = data;
        
        bot.sendMessage(userId,
          '✅ *Регион сохранен!*\n\n' +
          'Шаг 5/12: Отправьте *описание*:\n' +
          'Пример: *Аккаунт с топовыми скинами и хорошим MMR*',
          { parse_mode: 'Markdown' }
        );
        break;
        
      case 'waiting_description':
        if (!text) return bot.sendMessage(userId, '❌ Пожалуйста, отправьте текст.');
        data.description = text;
        formState.step = 'waiting_image';
        formState.data = data;
        
        bot.sendMessage(userId,
          '✅ *Описание сохранено!*\n\n' +
          'Шаг 6/12: Отправьте *изображение* для аккаунта:\n' +
          'Можно отправить:\n' +
          '• Фото (прикрепите как файл)\n' +
          '• URL изображения (начинается с http)\n' +
          '• Или отправьте "-" чтобы пропустить',
          { parse_mode: 'Markdown' }
        );
        break;
        
      case 'waiting_image':
        if (photo && photo.length > 0) {
          const fileId = photo[photo.length - 1].file_id;
          data.image_url = fileId;
          bot.sendMessage(userId, '✅ *Фото сохранено!', { parse_mode: 'Markdown' });
        } else if (text && text.startsWith('http')) {
          data.image_url = text;
          bot.sendMessage(userId, '✅ *URL изображения сохранен!', { parse_mode: 'Markdown' });
        } else if (text && text === '-') {
          data.image_url = '';
          bot.sendMessage(userId, '✅ *Изображение пропущено.*', { parse_mode: 'Markdown' });
        } else if (!text) {
          return bot.sendMessage(userId, 
            '❌ Пожалуйста, отправьте фото, URL или "-".'
          );
        } else {
          return bot.sendMessage(userId, 
            '❌ Неверный формат изображения. Отправьте фото, URL или "-".'
          );
        }
        
        formState.step = 'waiting_login';
        formState.data = data;
        
        bot.sendMessage(userId,
          'Шаг 7/12: Отправьте *логин* аккаунта:',
          { parse_mode: 'Markdown' }
        );
        break;
        
      case 'waiting_login':
        if (!text) return bot.sendMessage(userId, '❌ Пожалуйста, отправьте текст.');
        data.login = text;
        formState.step = 'waiting_password';
        formState.data = data;
        
        bot.sendMessage(userId,
          '✅ *Логин сохранен!*\n\n' +
          'Шаг 8/12: Отправьте *пароль* аккаунта:',
          { parse_mode: 'Markdown' }
        );
        break;
        
      case 'waiting_password':
        if (!text) return bot.sendMessage(userId, '❌ Пожалуйста, отправьте текст.');
        data.password = text;
        formState.step = 'waiting_email';
        formState.data = data;
        
        bot.sendMessage(userId,
          '✅ *Пароль сохранен!*\n\n' +
          'Шаг 9/12: Отправьте *email* аккаунта (если есть):\n' +
          'Или отправьте "-" если email нет',
          { parse_mode: 'Markdown' }
        );
        break;
        
      case 'waiting_email':
        if (!text) return bot.sendMessage(userId, '❌ Пожалуйста, отправьте текст.');
        data.email = text === '-' ? '' : text;
        formState.step = 'waiting_email_password';
        formState.data = data;
        
        bot.sendMessage(userId,
          '✅ *Email сохранен!*\n\n' +
          'Шаг 10/12: Отправьте *пароль от email* (если есть):\n' +
          'Или отправьте "-" если нет',
          { parse_mode: 'Markdown' }
        );
        break;
        
      case 'waiting_email_password':
        if (!text) return bot.sendMessage(userId, '❌ Пожалуйста, отправьте текст.');
        data.email_password = text === '-' ? '' : text;
        formState.step = 'waiting_additional_info';
        formState.data = data;
        
        bot.sendMessage(userId,
          '✅ *Пароль от email сохранен!*\n\n' +
          'Шаг 11/12: Отправьте *дополнительную информацию*:\n' +
          'Например: коды восстановления, привязанные аккаунты и т.д.\n' +
          'Или отправьте "-" если нет',
          { parse_mode: 'Markdown' }
        );
        break;
        
      case 'waiting_additional_info':
        if (!text) return bot.sendMessage(userId, '❌ Пожалуйста, отправьте текст.');
        data.additional_info = text === '-' ? '' : text;
        formState.step = 'waiting_confirm';
        formState.data = data;
        
        const priceFormatted = formatPrice(data.price_rub);
        const summary = `📋 *Проверьте данные:*\n\n` +
          `*Название:* ${data.title}\n` +
          `*Ранг:* ${data.rank}\n` +
          `*Цена:* ${priceFormatted}\n` +
          `*Регион:* ${data.region}\n` +
          `*Описание:* ${data.description}\n` +
          `*Изображение:* ${data.image_url ? (data.image_url.startsWith('http') ? 'URL' : 'Фото') : 'Нет'}\n` +
          `*Логин:* ${data.login}\n` +
          `*Пароль:* ${data.password}\n` +
          `*Email:* ${data.email || 'Нет'}\n` +
          `*Пароль от email:* ${data.email_password ? 'Есть' : 'Нет'}\n` +
          `*Доп. информация:* ${data.additional_info || 'Нет'}\n\n` +
          `Всё верно?`;
        
        bot.sendMessage(userId, summary, {
          parse_mode: 'Markdown',
          reply_markup: {
            inline_keyboard: [
              [{ text: '✅ Да, добавить', callback_data: 'admin_confirm_add' }],
              [{ text: '❌ Отменить', callback_data: 'admin_cancel_add' }]
            ]
          }
        });
        break;
    }
    
    memoryUsers.get(userId).adminAccountForm = formState;
    
  } catch (error) {
    console.error('Ошибка формы добавления:', error);
    delete userState.adminAccountForm;
    bot.sendMessage(userId, '❌ Ошибка. Начните заново через админ-панель.');
  }
}

// Обработка подтверждения добавления аккаунта в админ-панели
bot.on('callback_query', async (callbackQuery) => {
  const { data, from, message } = callbackQuery;
  const userId = from.id;
  
  if (data === 'admin_confirm_add' && isAdmin(userId)) {
    const userState = memoryUsers.get(userId);
    if (!userState || !userState.adminAccountForm || !userState.adminAccountForm.data) {
      try {
        await bot.answerCallbackQuery(callbackQuery.id, { text: 'Сессия устарела' });
      } catch (error) {
        // Игнорируем
      }
      return;
    }
    
    const accountData = userState.adminAccountForm.data;
    
    try {
      const newAccount = new Account({
        title: accountData.title,
        rank: accountData.rank,
        price_usd: accountData.price_usd,
        price_rub: accountData.price_rub,
        region: accountData.region,
        description: accountData.description,
        image_url: accountData.image_url || '',
        login: accountData.login,
        password: accountData.password,
        email: accountData.email || undefined,
        email_password: accountData.email_password || undefined,
        additional_info: accountData.additional_info || undefined,
        is_sold: false,
        added_by: userId,
        created_at: new Date()
      });
      
      await newAccount.save();
      
      delete userState.adminAccountForm;
      
      const priceFormatted = formatPrice(accountData.price_rub);
      
      await safeEditMessage(
        message.chat.id,
        message.message_id,
        `✅ *Аккаунт успешно добавлен!*\n\n` +
        `*Название:* ${accountData.title}\n` +
        `*Ранг:* ${accountData.rank}\n` +
        `*Цена:* ${priceFormatted}\n` +
        `*Регион:* ${accountData.region}\n\n` +
        `🆔 ID: \`${newAccount._id}\``,
        {
          parse_mode: 'Markdown',
          reply_markup: {
            inline_keyboard: [
              [{ text: '📦 Посмотреть все', callback_data: 'admin_all_accounts' }],
              [{ text: '➕ Добавить еще', callback_data: 'admin_add_account' }],
              [{ text: '↩️ Назад', callback_data: 'back_to_admin' }]
            ]
          }
        }
      );
      
    } catch (error) {
      console.error('Ошибка сохранения аккаунта:', error);
      await safeEditMessage(
        message.chat.id,
        message.message_id,
        '❌ Ошибка при сохранении аккаунта:\n' + error.message
      );
    }
    
    try {
      await bot.answerCallbackQuery(callbackQuery.id);
    } catch (error) {
      // Игнорируем
    }
  }
  
  if (data === 'admin_cancel_add') {
    const userState = memoryUsers.get(userId);
    if (userState) delete userState.adminAccountForm;
    
    await safeEditMessage(message.chat.id, message.message_id, '❌ Добавление отменено.', {
      reply_markup: {
        inline_keyboard: [
          [{ text: '↩️ Назад', callback_data: 'back_to_admin' }]
        ]
      }
    });
    try {
      await bot.answerCallbackQuery(callbackQuery.id);
    } catch (error) {
      // Игнорируем
    }
  }
});

async function showAllUsers(userId, originalMessage) {
  try {
    const users = await User.find({}).sort({ created_at: -1 }).limit(10);
    
    if (users.length === 0) {
      return safeEditMessage(originalMessage.chat.id, originalMessage.message_id, '👥 Пользователей пока нет.', {
        reply_markup: {
          inline_keyboard: [
            [{ text: '↩️ Назад', callback_data: 'back_to_admin' }]
          ]
        }
      });
    }
    
    let message = '👥 *Последние 10 пользователей:*\n\n';
    
    users.forEach((user, index) => {
      const date = new Date(user.created_at).toLocaleDateString('ru-RU', { timeZone: 'Europe/Moscow' });
      message += `*${index + 1}. @${user.username || 'без username'}*\n`;
      message += `   🆔: ${user.user_id}\n`;
      message += `   👤: ${user.first_name || 'Не указано'}\n`;
      message += `   📅: ${date}\n`;
      message += `   👑: ${user.role}\n`;
      message += `   ─────\n`;
    });
    
    message += `\n📊 Всего: ${await User.countDocuments()} пользователей`;
    
    await safeEditMessage(originalMessage.chat.id, originalMessage.message_id, message, {
      parse_mode: 'Markdown',
      reply_markup: {
        inline_keyboard: [
          [{ text: '↩️ Назад', callback_data: 'back_to_admin' }]
        ]
      }
    });
    
  } catch (error) {
    console.error('Ошибка загрузки пользователей:', error);
    await safeEditMessage(
      originalMessage.chat.id,
      originalMessage.message_id,
      '❌ Ошибка загрузки пользователей: ' + error.message
    );
  }
}

// ========== API ДЛЯ RENDER ==========
app.get('/', (req, res) => {
  res.json({
    status: 'ok',
    bot: 'running',
    mongo: mongoose.connection.readyState === 1 ? 'connected' : 'disconnected',
    uptime: process.uptime(),
    timestamp: new Date().toLocaleString('ru-RU', { timeZone: 'Europe/Moscow' })
  });
});

app.get('/api/health', (req, res) => {
  const mongoStatus = mongoose.connection.readyState === 1 ? 'connected' : 'disconnected';
  
  if (mongoStatus !== 'connected') {
    return res.status(500).json({ 
      status: 'error',
      mongo: mongoStatus,
      message: 'MongoDB disconnected'
    });
  }
  
  res.json({ 
    status: 'ok',
    memory: process.memoryUsage(),
    uptime: process.uptime(),
    mongo: mongoStatus,
    timestamp: new Date().toLocaleString('ru-RU', { timeZone: 'Europe/Moscow' })
  });
});

app.get('/ping', (req, res) => {
  console.log('🏓 Ping received');
  res.send('pong');
});

// 1. Получить все доступные аккаунты (для каталога в Mini App)
app.get('/api/accounts', async (req, res) => {
  try {
    const accounts = await Account.find({ is_sold: false })
      .select('-login -password -email_password -recovery_codes'); // не отдаём чувствительные данные
    res.json(accounts);
  } catch (err) {
    console.error('Ошибка /api/accounts:', err);
    res.status(500).json({ error: 'Ошибка сервера' });
  }
});

// 2. Получить детали одного аккаунта (только для авторизованного пользователя)
app.get('/api/accounts/:id', async (req, res) => {
  try {
    const account = await Account.findById(req.params.id);
    if (!account || account.is_sold) {
      return res.status(404).json({ error: 'Аккаунт не найден или продан' });
    }
    res.json(account);
  } catch (err) {
    res.status(500).json({ error: 'Ошибка сервера' });
  }
});

// 3. Создать заказ на покупку аккаунта
app.post('/api/orders/account', async (req, res) => {
  const { accountId, userId } = req.body;

  try {
    const account = await Account.findById(accountId);
    if (!account || account.is_sold) {
      return res.status(400).json({ error: 'Аккаунт недоступен' });
    }

    const order = new Order({
      user_id: userId,
      account_id: account._id,
      type: 'account',
      amount_rub: account.price_rub,
      status: 'pending',
      created_at: new Date()
    });
    await order.save();

    // Помечаем как проданный (можно сделать позже, после оплаты)
    // await Account.findByIdAndUpdate(accountId, { is_sold: true });

    res.json({ success: true, orderId: order._id });
  } catch (err) {
    console.error('Ошибка создания заказа:', err);
    res.status(500).json({ error: 'Ошибка сервера' });
  }
});

// 4. Создать заказ на буст (пока заглушка, потом доработаем)
app.post('/api/orders/boost', async (req, res) => {
  const { userId, fromRank, toRank, region, wishes } = req.body;

  try {
    const order = new Order({
      user_id: userId,
      type: 'boost',
      boost_details: { from_rank: fromRank, to_rank: toRank, region },
      amount_rub: 5000, // пример цены, потом рассчитай
      status: 'pending',
    });
    await order.save();

    res.json({ success: true, orderId: order._id });
  } catch (err) {
    res.status(500).json({ error: 'Ошибка сервера' });
  }
});

// ========== ЗАПУСК СЕРВЕРА ==========
const PORT = process.env.PORT || 3000;
let server;

const startServer = async () => {
  server = app.listen(PORT, () => {
    console.log(`🚀 Сервер запущен на порту ${PORT}`);
    console.log(`🌐 Health check: https://valorant-bot-backend.onrender.com/health`);
    
    // Keep-alive для Render (каждые 4 минуты)
    setInterval(async () => {
      const currentTime = new Date().toLocaleTimeString('ru-RU', { timeZone: 'Europe/Moscow' });
      console.log(`🔄 Keep-alive: ${currentTime}`);
      
      try {
        const response = await fetch(`https://valorant-bot-backend.onrender.com/ping`);
        if (response.ok) {
          console.log('✅ Keep-alive успешен');
        }
      } catch (error) {
        console.log('⚠️ Keep-alive не удался:', error.message);
      }
    }, 4 * 60 * 1000); // Каждые 4 минуты
  });
};

// Graceful shutdown
const gracefulShutdown = () => {
  console.log('🛑 SIGTERM получен, останавливаем бота...');
  console.log('⏰ Время получения SIGTERM:', new Date().toLocaleString('ru-RU', { timeZone: 'Europe/Moscow' }));
  
  // Останавливаем поллинг
  if (bot && bot.stopPolling) {
    bot.stopPolling();
    console.log('🤖 Поллинг бота остановлен');
  }
  
  // Закрываем сервер
  if (server && server.close) {
    server.close(() => {
      console.log('🌐 Сервер остановлен');
      console.log('✅ Бот остановлен корректно');
      process.exit(0);
    });
    
    // Форсируем завершение через 5 секунд
    setTimeout(() => {
      console.log('⏰ Принудительное завершение...');
      process.exit(0);
    }, 5000);
  } else {
    process.exit(0);
  }
};

// Обработчики сигналов
process.on('SIGTERM', gracefulShutdown);
process.on('SIGINT', gracefulShutdown);

// Запускаем сервер
startServer().catch(err => {
  console.error('❌ Ошибка запуска сервера:', err);
  process.exit(1);
});