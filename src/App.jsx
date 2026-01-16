import React, { useState, useEffect } from 'react';
import WebApp from '@twa-dev/sdk';
import axios from 'axios';
import {
  Container,
  Typography,
  Grid,
  Card,
  CardContent,
  CardMedia,
  Button,
  Chip,
  Box,
  TextField,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  CircularProgress,
  Snackbar,
  Alert,
  AppBar,
  Toolbar,
  IconButton,
  Divider,
  Badge,
  Tabs,
  Tab,
  Paper,
  Avatar,
  CardActions,
  List,
  ListItem,
  ListItemText
} from '@mui/material';
import {
  ShoppingCart,
  AccountCircle,
  Home,
  Search,
  Payment,
  Security,
  CheckCircle,
  Public,
  MilitaryTech,
  Email,
  Star,
  ShoppingBag,
  FilterList,
  ArrowBack
} from '@mui/icons-material';

// Определяем API URL
const API_BASE_URL = process.env.REACT_APP_API_URL || 'https://valorant-bot-backend.onrender.com';

function TabPanel({ children, value, index, ...other }) {
  return (
    <div hidden={value !== index} {...other}>
      {value === index && <Box sx={{ p: 2 }}>{children}</Box>}
    </div>
  );
}

const App = () => {
  const [user, setUser] = useState(null);
  const [accounts, setAccounts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedAccount, setSelectedAccount] = useState(null);
  const [showAccountDialog, setShowAccountDialog] = useState(false);
  const [showPaymentDialog, setShowPaymentDialog] = useState(false);
  const [orders, setOrders] = useState([]);
  const [activeTab, setActiveTab] = useState(0);
  const [notification, setNotification] = useState({ open: false, message: '', severity: 'info' });
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    console.log('App initializing...');
    
    // Инициализация Telegram WebApp
    if (window.Telegram?.WebApp) {
      const tg = window.Telegram.WebApp;
      tg.ready();
      tg.expand();
      
      const initData = tg.initDataUnsafe;
      console.log('Telegram user:', initData.user);
      
      if (initData.user) {
        const tgUser = {
          id: initData.user.id,
          firstName: initData.user.first_name,
          lastName: initData.user.last_name || '',
          username: initData.user.username,
          isPremium: initData.user.is_premium || false
        };
        setUser(tgUser);
        loadData(tgUser.id);
      } else {
        // Демо режим для тестирования
        const demoUser = {
          id: 123456789,
          firstName: 'Демо',
          lastName: 'Пользователь',
          username: 'demo_user'
        };
        setUser(demoUser);
        loadData(demoUser.id);
      }
    } else {
      console.log('Running in browser mode');
      const demoUser = {
        id: 123456789,
        firstName: 'Демо',
        lastName: 'Пользователь',
        username: 'demo_user'
      };
      setUser(demoUser);
      loadData(demoUser.id);
    }
  }, []);

  const loadData = async (userId) => {
    try {
      setLoading(true);
      
      // Загружаем аккаунты
      const accountsRes = await axios.get(`${API_BASE_URL}/api/accounts`);
      console.log('Loaded accounts:', accountsRes.data);
      
      if (Array.isArray(accountsRes.data)) {
        const availableAccounts = accountsRes.data.filter(acc => acc && !acc.is_sold);
        setAccounts(availableAccounts);
        
        if (availableAccounts.length === 0) {
          // Демо данные если нет реальных
          setAccounts(getDemoAccounts());
        }
      } else {
        setAccounts(getDemoAccounts());
      }
      
      // Пытаемся загрузить заказы
      try {
        const ordersRes = await axios.get(`${API_BASE_URL}/api/orders/user/${userId}`);
        if (Array.isArray(ordersRes.data)) {
          setOrders(ordersRes.data);
        }
      } catch (orderError) {
        console.log('Could not load orders:', orderError.message);
      }
      
    } catch (error) {
      console.error('Error loading data:', error);
      setAccounts(getDemoAccounts());
      showNotification('Используются демо-данные', 'info');
    } finally {
      setLoading(false);
    }
  };

  const getDemoAccounts = () => [
    {
      _id: 'demo1',
      title: 'Аккаунт Radiant с Prime Vandal',
      rank: 'Radiant 450 RR',
      price_rub: 25000,
      region: 'EU',
      description: 'Премиум аккаунт с коллекцией скинов',
      skins: ['Prime Vandal', 'Reaver Knife'],
      agents: ['Jett', 'Reyna'],
      level: 156,
      is_sold: false
    },
    {
      _id: 'demo2',
      title: 'Immortal 3 с полной коллекцией',
      rank: 'Immortal 3',
      price_rub: 15000,
      region: 'CIS',
      description: 'Все агенты разблокированы',
      skins: ['Glitchpop Phantom', 'Oni Phantom'],
      agents: ['Все агенты'],
      level: 203,
      is_sold: false
    }
  ];

  const showNotification = (message, severity = 'info') => {
    setNotification({ open: true, message, severity });
  };

  const formatPrice = (rubPrice) => {
    if (!rubPrice) return '0₽';
    const usdPrice = (rubPrice / 95).toFixed(2);
    return `${rubPrice}₽ ($${usdPrice})`;
  };

  const getRankColor = (rank) => {
    if (!rank) return '#1976d2';
    const rankColors = {
      'Iron': '#727272', 'Bronze': '#CD7F32', 'Silver': '#C0C0C0',
      'Gold': '#FFD700', 'Platinum': '#00CED1', 'Diamond': '#B9F2FF',
      'Ascendant': '#FF6B6B', 'Immortal': '#8A2BE2', 'Radiant': '#FFD700'
    };
    const rankName = rank.split(' ')[0];
    return rankColors[rankName] || '#1976d2';
  };

  const handleBuyAccount = (account) => {
    setSelectedAccount(account);
    setShowPaymentDialog(true);
  };

  const handleConfirmPurchase = () => {
    showNotification('Свяжитесь с менеджером @ricksxxx для оплаты', 'success');
    setShowPaymentDialog(false);
    
    // Открываем Telegram
    if (window.Telegram?.WebApp) {
      window.Telegram.WebApp.openTelegramLink('https://t.me/ricksxxx');
    } else {
      window.open('https://t.me/ricksxxx', '_blank');
    }
  };

  const renderHome = () => {
    if (loading) {
      return (
        <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '50vh' }}>
          <CircularProgress />
        </Box>
      );
    }

    const filteredAccounts = accounts.filter(account =>
      !searchQuery || 
      account.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      account.rank.toLowerCase().includes(searchQuery.toLowerCase())
    );

    return (
      <>
        <Box sx={{ p: 2 }}>
          <TextField
            fullWidth
            placeholder="Поиск аккаунтов..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            InputProps={{
              startAdornment: <Search sx={{ mr: 1, color: 'text.secondary' }} />
            }}
            sx={{ mb: 2 }}
          />
        </Box>

        {filteredAccounts.length === 0 ? (
          <Box sx={{ textAlign: 'center', py: 4 }}>
            <Typography color="text.secondary">Аккаунты не найдены</Typography>
          </Box>
        ) : (
          <Grid container spacing={2} sx={{ p: 2, pb: 10 }}>
            {filteredAccounts.map(account => (
              <Grid item xs={12} sm={6} key={account._id}>
                <Card sx={{ height: '100%' }}>
                  <CardContent>
                    <Typography variant="h6" gutterBottom>
                      {account.title}
                    </Typography>
                    
                    <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                      <Chip 
                        label={account.rank}
                        sx={{ 
                          bgcolor: getRankColor(account.rank),
                          color: 'white',
                          mr: 1
                        }}
                      />
                      <Chip label={account.region} size="small" />
                    </Box>
                    
                    <Typography variant="body2" color="text.secondary" paragraph>
                      {account.description || 'Описание отсутствует'}
                    </Typography>
                    
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <Typography variant="h6" color="primary">
                        {formatPrice(account.price_rub)}
                      </Typography>
                      <Button 
                        variant="contained" 
                        size="small"
                        onClick={() => {
                          setSelectedAccount(account);
                          setShowAccountDialog(true);
                        }}
                      >
                        Подробнее
                      </Button>
                    </Box>
                  </CardContent>
                </Card>
              </Grid>
            ))}
          </Grid>
        )}
      </>
    );
  };

  const renderOrders = () => {
    return (
      <Box sx={{ p: 2 }}>
        {orders.length === 0 ? (
          <Box sx={{ textAlign: 'center', py: 4 }}>
            <ShoppingBag sx={{ fontSize: 60, color: 'text.secondary', mb: 2 }} />
            <Typography variant="h6" color="text.secondary">
              У вас пока нет заказов
            </Typography>
          </Box>
        ) : (
          <List>
            {orders.map(order => (
              <Card key={order._id} sx={{ mb: 2 }}>
                <CardContent>
                  <Typography variant="h6">
                    Заказ #{order._id?.slice(-6) || 'N/A'}
                  </Typography>
                  <Typography color="text.secondary">
                    Статус: {order.status === 'completed' ? '✅ Выполнен' : '⏳ В обработке'}
                  </Typography>
                  <Typography color="text.secondary">
                    Сумма: {formatPrice(order.amount_rub)}
                  </Typography>
                </CardContent>
              </Card>
            ))}
          </List>
        )}
      </Box>
    );
  };

  const renderProfile = () => {
    if (!user) return null;

    return (
      <Box sx={{ p: 2 }}>
        <Card>
          <CardContent>
            <Box sx={{ display: 'flex', alignItems: 'center', mb: 3 }}>
              <Avatar sx={{ width: 60, height: 60, mr: 2, bgcolor: 'primary.main' }}>
                {user.firstName?.[0] || 'U'}
              </Avatar>
              <Box>
                <Typography variant="h5">
                  {user.firstName} {user.lastName}
                </Typography>
                <Typography color="text.secondary">
                  @{user.username || 'без username'}
                </Typography>
              </Box>
            </Box>

            <Divider sx={{ my: 2 }} />

            <Button
              variant="outlined"
              fullWidth
              onClick={() => window.open('https://t.me/ricksxxx', '_blank')}
              sx={{ mb: 1 }}
              startIcon={<Email />}
            >
              Связаться с поддержкой
            </Button>
          </CardContent>
        </Card>
      </Box>
    );
  };

  return (
    <Container maxWidth="md" disableGutters sx={{ height: '100vh' }}>
      {/* Верхний бар */}
      <AppBar position="sticky">
        <Toolbar>
          <Typography variant="h6" sx={{ flexGrow: 1 }}>
            Valorant Accounts
          </Typography>
          <IconButton color="inherit" onClick={() => setActiveTab(1)}>
            <Badge badgeContent={orders.length} color="error">
              <ShoppingCart />
            </Badge>
          </IconButton>
          <IconButton color="inherit" onClick={() => setActiveTab(2)}>
            <AccountCircle />
          </IconButton>
        </Toolbar>
      </AppBar>

      {/* Табы */}
      <Box sx={{ borderBottom: 1, borderColor: 'divider' }}>
        <Tabs value={activeTab} onChange={(e, newValue) => setActiveTab(newValue)} centered>
          <Tab icon={<Home />} label="Каталог" />
          <Tab icon={<ShoppingCart />} label="Заказы" />
          <Tab icon={<AccountCircle />} label="Профиль" />
        </Tabs>
      </Box>

      {/* Контент */}
      <TabPanel value={activeTab} index={0}>
        {renderHome()}
      </TabPanel>
      <TabPanel value={activeTab} index={1}>
        {renderOrders()}
      </TabPanel>
      <TabPanel value={activeTab} index={2}>
        {renderProfile()}
      </TabPanel>

      {/* Диалог аккаунта */}
      <Dialog open={showAccountDialog} onClose={() => setShowAccountDialog(false)} maxWidth="sm" fullWidth>
        {selectedAccount && (
          <>
            <DialogTitle>{selectedAccount.title}</DialogTitle>
            <DialogContent>
              <Box sx={{ mb: 2 }}>
                <Chip 
                  label={selectedAccount.rank}
                  sx={{ bgcolor: getRankColor(selectedAccount.rank), color: 'white', mr: 1 }}
                />
                <Chip label={selectedAccount.region} />
              </Box>
              
              <Typography paragraph>{selectedAccount.description}</Typography>
              
              {selectedAccount.skins && selectedAccount.skins.length > 0 && (
                <>
                  <Typography variant="subtitle2" gutterBottom>Скины:</Typography>
                  <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5, mb: 2 }}>
                    {selectedAccount.skins.map((skin, idx) => (
                      <Chip key={idx} label={skin} size="small" />
                    ))}
                  </Box>
                </>
              )}
              
              <Typography variant="h5" color="primary" gutterBottom>
                {formatPrice(selectedAccount.price_rub)}
              </Typography>
            </DialogContent>
            <DialogActions>
              <Button onClick={() => setShowAccountDialog(false)}>Закрыть</Button>
              <Button 
                variant="contained" 
                onClick={() => {
                  setShowAccountDialog(false);
                  handleBuyAccount(selectedAccount);
                }}
              >
                Купить
              </Button>
            </DialogActions>
          </>
        )}
      </Dialog>

      {/* Диалог оплаты */}
      <Dialog open={showPaymentDialog} onClose={() => setShowPaymentDialog(false)}>
        <DialogTitle>Подтверждение покупки</DialogTitle>
        <DialogContent>
          {selectedAccount && (
            <>
              <Typography variant="h6" gutterBottom>
                {selectedAccount.title}
              </Typography>
              <Typography color="primary" gutterBottom>
                {formatPrice(selectedAccount.price_rub)}
              </Typography>
              <Typography variant="body2" paragraph>
                Для завершения покупки свяжитесь с менеджером @ricksxxx
              </Typography>
            </>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setShowPaymentDialog(false)}>Отмена</Button>
          <Button variant="contained" onClick={handleConfirmPurchase}>
            Перейти к оплате
          </Button>
        </DialogActions>
      </Dialog>

      {/* Уведомления */}
      <Snackbar
        open={notification.open}
        autoHideDuration={6000}
        onClose={() => setNotification({ ...notification, open: false })}
      >
        <Alert severity={notification.severity}>
          {notification.message}
        </Alert>
      </Snackbar>
    </Container>
  );
};

export default App;