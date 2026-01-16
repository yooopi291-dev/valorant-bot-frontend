export const DICT = {
  ru: {
    home: 'Главная',
    catalog: 'Каталог',
    boost: 'Буст',
    favorites: 'Избранное',
    cart: 'Корзина',
    profile: 'Профиль',
  },
  en: {
    home: 'Home',
    catalog: 'Catalog',
    boost: 'Boost',
    favorites: 'Favorites',
    cart: 'Cart',
    profile: 'Profile',
  },
};

export function t(lang) {
  return DICT[lang] || DICT.ru;
}
