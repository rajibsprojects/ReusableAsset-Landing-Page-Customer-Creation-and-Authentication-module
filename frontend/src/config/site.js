export const BRAND = {
  name: "Madam Boutique",
  fashions: "Madam Fashions",
  tagline: "Tailored for You",
  topbar: "Crafted with Care | Designed for You",
  footerLine: "Empowering Women. Creating Confidence. Stitching Dreams.",
};

export const ROUTES = {
  home: "/",
  login: "/login",
  signup: "/signup",
  forgot: "/forgot-password",
  reset: "/reset-password",
  account: "/account",
  boutique: "/boutique",
  fashions: "/fashions",
  orderStatus: "/order-status",
  admin: "/admin",
  contact: "/#contact",
};

export const NAV_LINKS = [
  { label: "Home", to: ROUTES.home, testId: "nav-home" },
  { label: "Madam Boutique", to: ROUTES.boutique, testId: "nav-boutique" },
  { label: "Madam Fashions", to: ROUTES.fashions, testId: "nav-fashions" },
  { label: "Order Status", to: ROUTES.orderStatus, testId: "nav-order-status" },
  { label: "Contact Us", to: ROUTES.contact, testId: "nav-contact" },
];

export const IMAGES = {
  hero: "https://images.unsplash.com/photo-1773439878067-4cdadc0b1124?crop=entropy&cs=srgb&fm=jpg&q=85&w=1400",
  about: "https://images.unsplash.com/photo-1578353022142-09264fd64295?crop=entropy&cs=srgb&fm=jpg&q=85&w=1000",
  boutique: "https://images.unsplash.com/photo-1457972657980-4c9fddebec8d?crop=entropy&cs=srgb&fm=jpg&q=85&w=800",
  fashions: "https://images.unsplash.com/photo-1606259458027-54d2a728b6ab?crop=entropy&cs=srgb&fm=jpg&q=85&w=800",
  owner: "https://images.pexels.com/photos/8819157/pexels-photo-8819157.jpeg?auto=compress&cs=tinysrgb&w=1000",
  authBg: "https://images.unsplash.com/photo-1769107805465-bfd41863f1a0?crop=entropy&cs=srgb&fm=jpg&q=70&w=1800",
};
